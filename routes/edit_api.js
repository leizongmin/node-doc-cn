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

};