var path = require('path');
var fs = require('fs');
var async = require('async');


var TEMPLATE_FILE = path.resolve(__dirname, 'template.html');
var API_PATH = path.resolve(__dirname, '../api');

// 取API文件名
function resolveAPIPath (name) {
  return path.resolve(API_PATH, name + '.markdown');
}

// 读取文件内容
function readAPIFile (name, callback) {
  if (name === 'index') name = '_toc';
  if (name === 'all') {
    var filename = resolveAPIPath(name);
    fs.readFile(filename, 'utf8', function (err, content) {
      if (err) return callback(err);
      processIncludes(content, function (err, content) {
        callback(err, content, filename);
      });
    });
  } else {
    var filename = resolveAPIPath(name);
    fs.readFile(filename, 'utf8', function (err, content) {
      callback(err, content, filename);
    });
  }
}

// 处理包含文件
function processIncludes (content, callback) {
  var includeExpr = /^@include\s+([A-Za-z0-9-_]+)(?:\.)?([a-zA-Z]*)$/gmi;
  var includes = content.match(includeExpr);
  if (includes === null) return cb(null, content);

  includes = includes.map(function(include) {
    var fname = include.replace(/^@include\s+/, '');
    if (fname.match(/\.markdown$/)) fname = fname.slice(0, -9);
    return fname;
  });

  var allContent = [];
  async.eachSeries(includes, function (name, next) {
    readAPIFile(name, function (err, content, filename) {
      if (!err) {
        allContent.push(content);
      }
      next();
    });
  }, function (err) {
    if (err) return callback(err);
    callback(null, allContent.join('\n'));
  });
}


exports.resolveAPIPath = resolveAPIPath;
exports.readAPIFile = readAPIFile;
exports.processIncludes = processIncludes;
exports.TEMPLATE_FILE = TEMPLATE_FILE;
exports.API_PATH = API_PATH;