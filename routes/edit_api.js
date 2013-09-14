var path = require('path');
var fs = require('fs');
var utils = require('./utils');

module.exports = function (app) {

  app.get('/', function (req, res, next) {
    req.url = '/public/index.html';
    app(req, res);
  });

  app.get('/edit/:name', function (req, res, next) {
    var name = req.params.name;
    utils.readAPIFile(name, function (err, content) {
      if (err) return next(err);

      var lines = content.split(/\r?\n\r?\n/);
      res.locals.originLines = lines;
      res.render('edit');
    });
  });

};