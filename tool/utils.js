/**
 * 工具函数
 */

var crypto = require('crypto');


/**
 * 转换为标准换行符
 *
 * @param {String} text
 * @return {String}
 */
exports.standardLineBreak = function (text) {
  return text.split(/\n/).map(function (line) {
    return line.replace(/\r$/, '');
  }).join('\n');
};

/**
 * 32位MD5加密
 *
 * @param {string} text 文本
 * @return {string}
 */
exports.md5 = function (text) {
  return crypto.createHash('md5').update(text).digest('hex');
};
