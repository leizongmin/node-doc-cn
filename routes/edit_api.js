var path = require('path');
var fs = require('fs');

module.exports = function (app) {

  app.get('/', function (req, res, next) {
    req.url = '/public/index.html';
    app(req, res);
  });

};