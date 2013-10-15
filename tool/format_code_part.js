/**
 * 将 ``` 这种形式的代码块从 paragraph 转为 code*
 * 之前没有判断到这种情况
 */

var async = require('async');
var config = require('../config');
var utils = require('./utils');
var db = config.mysql;


console.log('查询出所有记录...');
db.select('origin_api', '*', '1', function (err, list) {
  if (err) throw err;

  console.log('  共%d条数据', list.length);

  var codeList = [];
  for (var i = 0; i < list.length; i++) {
    var a = list[i];
    var lines = utils.standardLineBreak(a.content).split(/\n/);
    if (a.type === 'code') continue;
    if (lines[0].substr(0, 3) === '```' || lines[lines.length - 1].substr(-3) === '```') {
      codeList.push(a);
    }
  }
  console.log('共有%d个代码块需要转换', codeList.length);

  async.eachSeries(codeList, function (item, next) {

    console.log('更新：[%d] %s', item.id, item.hash);

    db.update('origin_api', '`id`=' + item.id, {type: 'code'}, next);

  }, function (err) {
    if (err) throw err;

    console.log('完成');
    process.exit();
  });
});