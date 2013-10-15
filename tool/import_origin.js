/**
 * 导入英文版的文档
 */

var path = require('path');
var fs = require('fs');
var async = require('async');
var config = require('../config');
var utils = require('../routes/utils');
var standardLineBreak = require('./utils').standardLineBreak;
var db = config.mysql;

var ORIGIN_API_PATH = path.resolve(__dirname, '../origin/api');
var VERSION = (process.argv[2] || '').toLowerCase();
if (!(VERSION[0] === 'v' && VERSION.length > 1)) {
  console.error('请输入一个有效的版本号');
  process.exit(-1);
}

// 文件列表
var files = fs.readdirSync(ORIGIN_API_PATH);

// 先清空数据库中的旧数据
console.log('清空旧数据...');
db.delete('origin_api', '`version`=' + db.escape(VERSION), function (err) {
  console.log('  [完成]');

  async.eachSeries(files, function (n, done) {
    console.log('导入%s', n);
    var f = path.resolve(ORIGIN_API_PATH, n);
    fs.readFile(f, 'utf8', function (err, c) {
      if (err) return done(err);

      var plist = c.split(/\r?\n\r?\n/);
      console.log('  [%d块]', plist.length);

      async.eachSeries(plist, function (p, next) {

        // 统一换行符
        p = standardLineBreak(p);

        var lines = p.split(/\n/);
        var type = '';
        if (lines.length === 1) {
          if (/^#\s+.+/.test(lines[0])) {
            type = 'title';
          } else if (/<!--([^=]+)=([^\-]+)-->/.test(lines[0])) {
            type = 'meta';
          } else if (/^Stability: ([0-5])(?:\s*-\s*)?(.*)$/.test(lines[0].trim())) {
            type = 'stability';
          } else if (lines[0].substr(0, 4) === '    ') {
            type = 'code';
          } else {
            type = 'paragraph';
          }
        } else {
          // 每一行都是以四个空格开始，是代码块
          type = 'code';
          for (var i = 0; i < lines.length; i++) {
            if (lines[i].substr(0, 4) !== '    ') {
              type = 'paragraph';
              break;
            }
          }
        }

        console.log('    %s: %d行', type, lines.length);
        db.insert('origin_api', {
          hash:     utils.md5(p),
          type:     type,
          content:  p,
          file:     n.slice(0, -9),
          version:  VERSION
        }, function (err) {
          if (err) return next(err);
          console.log('      [完成]');
          next();
        });

      }, function (err) {
        if (err) {
          console.error(err.stack || err);
          process.exit(-1);
        }
        console.log('  [完成]');
        done();
      });
    });
  }, function (err) {
    if (err) throw err;

    console.log('[结束]');
    process.exit();
  });
});