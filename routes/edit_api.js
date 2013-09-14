var path = require('path');
var fs = require('fs');
var utils = require('./utils');
var check_signin = require('./check_signin');

module.exports = function (app) {

  app.get('/edit/:name', check_signin, function (req, res, next) {
    var name = req.params.name;
    utils.readAPIFile(name, function (err, content) {
      if (err) return next(err);

      var lines = content.split(/\r?\n\r?\n/);
      res.locals.originLines = lines;
      res.render('edit');
    });
  });

};