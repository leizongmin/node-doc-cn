var async = require('async');
var api2HTML = require('./to_html');
var api2JSON = require('../origin/tools/json');
var utils = require('./utils');
var config = require('../config');
var db = config.mysql;


module.exports = function (app) {

  // 网站首页
  app.get('/', function (req, res, next) {
    req.url = '/public/index.html';
    app(req, res);
  });

  // 浏览指定API页面
  app.get('/api/:name.:type', function (req, res, next) {
    var name = req.params.name;
    var type = req.params.type;

    utils.readAPIFile(name, function (err, content, filename) {
      if (err) return next(err);
      if (type === 'html') {
        api2HTML(content, filename, utils.TEMPLATE_FILE, function (err, html) {
          if (err) return next(err);
          res.writeHead(200, {'content-type': 'text/html'});
          res.end(html);
        });
      } else if (type === 'json') {
        api2JSON(content, filename, function (err, data) {
          if (err) return next(err);
          res.json(data);
        })
      } else {
        res.writeHead(200, {'content-type': 'text/plain'});
        res.end(content);
      }
    });
  });

  // API首页
  app.get('/api', function (req, res, next) {
    req.url = '/api/index.html';
    app(req, res);
  });

  // 翻译进度
  app.get('/progress', function (req, res, next) {
    // 查询出所有的文件名
    db.select('origin_api', 'file', '`version`=' + db.escape(config.api.version), 'GROUP BY `file`', function (err, files) {
      if (err) return next(err);
      files = files.map(function (f) {
        return f.file;
      });

      // 分别获取每个文件的翻译进度
      var results = [];
      var userIds = {};
      async.eachSeries(files, function (f, next) {

        var sql = 'SELECT `A`.`hash`,`B`.`user_id`' +
                  ' FROM `origin_api` AS `A`' +
                  ' LEFT JOIN `translate_api` AS `B`' +
                  ' ON `A`.`hash`=`B`.`origin_hash`' +
                  ' WHERE `file`=' + db.escape(f) +
                  ' AND `type`!="meta"' +
                  ' AND `version`=' + db.escape(config.api.version) +
                  ' GROUP BY `A`.`hash`';
        db.query(sql, function (err, list) {
          if (err) return next(err);

          var lines = {};
          var users = {};
          list.forEach(function (line) {
            var uid = line.user_id;
            var hash = line.hash;
            if (uid > 0) {
              userIds[uid] = true;
              // 记录用户翻译的数量
              if (uid in users) {
                users[uid]++
              } else {
                users[uid] = 1;
              }
              // 记录已经完成的数量
              if (hash in lines) {
                lines[hash]++;
              } else {
                lines[hash] = 1;
              }
            } else {
              lines[hash] = 0;
            }
          });

          var count = 0;
          var finish = 0;
          for (var i in lines) {
            count++;
            if (lines[i] > 0) finish++;
          }

          // 用户按照翻译数量排序
          var userList = [];
          for (var i in users) {
            userList.push({
              user_id: i,
              count:   users[i]
            });
          }
          userList.sort(function (a, b) {
            return b.count - a.count;
          });

          results.push({
            name:    f,
            count:   count,
            finish:  finish,
            percent: finish / count,
            users:   userList
          });

          next();
        });

      }, function (err) {
        if (err) return next(err);

        // 获取相关用户信息
        var users = {};
        async.eachSeries(Object.keys(userIds), function (uid, next) {

          db.selectOne('user_list', '`id`,`nickname`', '`id`=' + db.escape(uid), function (err, user) {
            if (err) return next(err);
            if (!user) user = {id: 0, nickname: '该用户不存在'};
            users[uid] = user;
            next();
          });

        }, function (err) {
          if (err) return next(err);

          // 按照完成量排序
          results.sort(function (a, b) {
            return b.percent - a.percent;
          });

          res.locals.files = results;
          res.locals.users = users;
          res.render('progress');
        });
      });
    });
  });

};
