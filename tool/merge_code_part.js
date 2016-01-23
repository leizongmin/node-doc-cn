/**
 * 合并相邻的代码块
 */

var async = require('async');
var config = require('../config');
var utils = require('./utils');
var db = config.mysql;


console.log('查询出所有记录...');
db.select('origin_api', '*', '1', 'ORDER BY `id` ASC', function (err, list) {
  if (err) throw err;

  console.log('  共%d条数据', list.length);

  // 找出相邻的代码块
  var parts = [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].type === 'code') {
      var c = 1;
      while (true) {
        if (list[i + c].type === 'code') {
          c++;
        } else {
          break;
        }
      }
      if (c > 1) {
        parts.push(list.slice(i, i + c));
        i += c;
      }
    }
  }

  console.log('共有%d个代码块需要合并', parts.length);

  async.eachSeries(parts, function (part, next) {

    // 生成新的代码块
    var newCode = utils.standardLineBreak(part.map(function (p) {
      return p.content;
    }).join('\n\n'));
    var newHash = utils.md5(newCode).toLowerCase();
    // 保留第一条，余下的删除
    var first = part[0];
    var rest = part.slice(1);

    console.log('更新：[%d] %s => %s', first.id, first.hash, newHash);

    db.update('origin_api', '`id`=' + first.id, {hash: newHash, content: newCode}, function (err) {
      if (err) return next(err);

      // 需要把余下的删除
      async.eachSeries(rest, function (item, next) {

        // TODO:需要改为实际删除
        console.log('  删除：[%d] %s', item.id, item.hash);
        //db.update('origin_api', '`id`=' + item.id, {is_removed: 1}, next);
        db.delete('origin_api', '`id`=' + item.id, next);

      }, function (err) {
        if (err) return next(err);

        // 依次查找出最好的翻译结果
        findTranslates(part, function (err, translates, userId) {
          if (err) return next(err);

          // 保存新的翻译结果
          console.log('  保存新的翻译结果: %s', userId);

          // 保存新的翻译结果
          var content = translates.join('\n\n');
          db.insert('translate_api', {
            user_id:     userId,
            origin_hash: newHash,
            content:     content,
            timestamp:   db.timestamp()
          }, next);
        });
      });
    });

  }, function (err) {
    if (err) throw err;

    console.log('完成');
    process.exit();
  });

});


// 查找出最好的翻译结果
function findTranslates (part, callback) {
  var translates = [];
  var userId = 0;
  async.eachSeries(part, function (item, next) {
    console.log('  查询翻译：%s', item.hash);
    var where = '`origin_hash`=' + db.escape(item.hash);
    var orderBy = 'ORDER BY `vote` DESC, `timestamp` DESC';
    db.selectOne('translate_api', '*', where, orderBy, function (err, t) {
      if (err) return next(err);

      if (t) {
        translates.push(t.content);
        if (!userId) userId = t.user_id;
      } else {
        translates.push(item.content);
      }

      next();
    });
  }, function (err) {
    callback(err, translates, userId);
  });
}
