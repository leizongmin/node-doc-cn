/**
 * 帮助页面
 */

var fs = require('fs');
var marked = require('marked');
var path = require('path');
var xss = require('xss');


module.exports = function (app) {

  var HEPL_PATH = path.resolve(__dirname, '../public/help');

  app.get('/help/:page', function (req, res, next) {
    var page = req.params.page;
    fs.readFile(path.resolve(HEPL_PATH, page + '.md'), 'utf8', function (err, content) {
      if (err) return next(err);

      var html = xss(marked(content));
      res.locals.body = html;
      res.render('help');
    });
  });

};