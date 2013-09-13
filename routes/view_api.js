var path = require('path');
var fs = require('fs');
var async = require('async');
var api2HTML = require('../tools/html');
var api2JSON = require('../tools/json');


var TEMPLATE_FILE = path.resolve(__dirname, '../tools/template.html');
var API_PATH = path.resolve(__dirname, '../api-en');

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


module.exports = function (app) {
  app.get('/api/:name.:type', function (req, res, next) {
    var name = req.params.name;
    var type = req.params.type;

    readAPIFile(name, function (err, content, filename) {
      if (err) return next(err);
      if (type === 'html') {
        api2HTML(content, filename, TEMPLATE_FILE, function (err, html) {
          if (err) return next(err);
          res.writeHead(200, {'content-type': 'text/html'});
          res.end(html);
        });
      } else {
        api2JSON(content, filename, function (err, data) {
          if (err) return next(err);
          res.json(data);
        })
      }
    });
  });

  app.get('/api', function (req, res, next) {
    req.url = '/api/index.html';
    app(req, res);
  });
};
