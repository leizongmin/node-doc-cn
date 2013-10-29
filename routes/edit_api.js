var path = require('path');
var fs = require('fs');
var async = require('async');
var utils = require('./utils');
var config = require('../config');
var db = config.mysql;
var check_signin = require('./check_signin');

module.exports = function (app) {

  app.get('/edit/:name', check_signin, function (req, res, next) {
    var name = req.params.name;
    if (name === 'index') name = '_toc';

    var where = '`file`=' + db.escape(name) +
                ' AND `version`=' + db.escape(config.api.version) +
                ' AND `type`!="meta"';
    db.select('origin_api', '*', where, 'ORDER BY `id` ASC', function (err, lines) {
      if (err) return next(err);

      // 查找出所有用户的翻译
      async.eachSeries(lines, function (line, next) {
        line.rows = line.content.split('\n').length;

        var where = '`origin_hash`=' + db.escape(line.hash);
        db.select('translate_api', '*', where, 'ORDER BY `timestamp` ASC', function (err, translates) {
          if (err) return next(err);

          // 如果当前用户曾经翻译过此项，则自动填写上去
          for (var i = 0; i < translates.length; i++) {
            if (translates[i].user_id == req.signinUser.id) {
              line.current = translates[i];
              //translates.splice(i, 1);
              break;
            }
          }

          line.translates = translates;
          next();
        });

      }, function (err) {
        if (err) return next(err);

        // 查询出所有相关用户的信息
        var users = {};
        lines.forEach(function (line) {
          line.translates.forEach(function (t) {
            users[t.user_id] = {};
          });
        });
        async.eachSeries(Object.keys(users), function (uid, next) {

          db.selectOne('user_list', '`id`, `email`, `nickname`', '`id`=' + db.escape(uid), function (err, user) {
            if (err) return next(err);
            if (!user) {
              user = {id: 0, email: '', nickname: '用户不存在'};
            }
            users[uid] = user;
            next();
          });

        }, function (err) {
          if (err) return next(err);

          res.locals.users = users;
          res.locals.lines = lines;
          res.render('edit');
        });
      });
    });
  });

  app.post('/translate/save', check_signin, function (req, res, next) {
    var hash = req.body.hash;
    var content = req.body.content;
    var user_id = req.signinUser.id;
    if (!(hash && hash.length === 32)) return res.json({error: 'hash参数有误'});
    if (!content) return res.json({error: '翻译后的内容不能为空'});
    hash = hash.toLowerCase();

    // 由于 &gt; 和 &lt; 转换会 > 和 <
    content = content.replace(/&gt;/g, '>').replace(/&lt;/, '<');

    // 检查修改后的内容，应尽量保留原有的格式
    db.selectOne('origin_api', '*', '`hash`=' + db.escape(hash), function (err, origin) {
      if (err) return res.json({error: err.toString()});
      if (!origin) return res.json({error: '要翻译的条目不存在'});

      function formatError (err) {
        res.json({error: '翻译时请保留原来的格式：' + err})
      }

      // 检查格式是否一致
      if (origin.type === 'title') {
        var i = origin.content.indexOf(' ');
        var j = content.indexOf(' ');
        if (i !== j) return formatError('标题前面应该有' + i + '个#后面再跟一个空格');
      } else if (origin.type === 'code') {
        var lines = content.split(/\r?\n/);
        var originLines = origin.content.split(/\r?\n/);
        if (originLines[0].substr(0, 3) === '```') {
          if (!(lines[0].substr(0, 3) === '```' && lines[lines.length - 1].trimRight() === '```')) {
            return formatError('代码块的首行和尾行必须是```');
          }
        } else {
          for (var i = 0; i < lines.length; i++) {
            if (lines[i].substr(0, 4) !== '    ') {
              return formatError('（第' + (i + 1) + '行）代码块的每一行应该以4个空格开头');
            }
          }
        }
      }

      // 保存修改结果
      var where = '`origin_hash`=' + db.escape(hash) + ' AND `user_id`=' + db.escape(user_id);
      db.selectOne('translate_api', '*', where, function (err, item) {
        if (err) return res.json({error: err.toString()});

        function callback (err, ret) {
          if (err) return res.json({error: err.toString()});
          if (ret.affectedRows > 0 || ret.insertId > 0) {
            res.json({success: 1});
          } else {
            res.json({success: 0});
          }
        }

        if (item) {
          db.update('translate_api', 'id=' + db.escape(item.id), {
            content:   content,
            timestamp: db.timestamp()
          }, callback);
        } else {
          db.insert('translate_api', {
            user_id:     user_id,
            origin_hash: hash,
            content:     content,
            timestamp:   db.timestamp()
          }, callback);
        }
      });
    });
  });

  app.post('/translate/vote', check_signin, function (req, res, next) {
    var id = req.body.id;
    if (!(id > 0)) return res.json({error: 'id参数有误'});

    var user_id = req.signinUser.id;
    var where = '`translate_id`=' + db.escape(id) + ' AND `user_id`=' + db.escape(user_id);
    db.selectOne('translate_vote_history', '*', where, function (err, vote) {
      if (err) return res.json({error: err.toString()});
      if (vote) return res.json({success: 0});

      db.insert('translate_vote_history', {
        translate_id: id,
        user_id:      user_id,
        timestamp:    db.timestamp()
      }, function (err, ret) {
        if (err) return res.json({error: err.toString()});

        var sql = 'UPDATE `translate_api` SET `vote`=`vote`+1 WHERE `id`=' + db.escape(id);
        db.query(sql, function (err, ret) {
          if (err) return res.json({error: err.toString()});

          res.json({success: ret.affectedRows});
        });
      });
    });
  });

  // 取指定段落的原文
  app.get('/translate/get/origin', function (req, res, next) {
    var hash = req.query.hash;
    if (!hash) return res.json({error: 'hash参数有误'});

    var where = '`hash`=' + db.escape(hash);
    db.selectOne('origin_api', '*', where, function (err, ret) {
      if (err) return res.json({error: err.toString()});
      if (!ret) return res.json({error: '该段落不存在'});

      ret.html = utils.markdownToHTML(ret.content);
      res.json(ret);
    });
  });

};