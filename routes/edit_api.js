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

        var where = '`origin_hash`=' + db.escape(lines.hash);
        db.select('translate_api', '*', where, 'ORDER BY `timestamp` ASC', function (err, translates) {
          if (err) return next(err);
          line.translates = translates;
          next();
        });

      }, function (err) {
        if (err) return next(err);

        res.locals.lines = lines;
        res.render('edit');
      });
    });
  });

};