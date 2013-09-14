var api2HTML = require('../origin/tools/html');
var api2JSON = require('../origin/tools/json');
var utils = require('./utils');


module.exports = function (app) {

  app.get('/', function (req, res, next) {
    req.url = '/public/index.html';
    app(req, res);
  });
  
  app.get('/api/:name.:type', function (req, res, next) {
    var name = req.params.name;
    var type = req.params.type;

    utils.readAPIFile(name, function (err, content, filename) {
      if (err) return next(err);
      if (type === 'html') {
        api2HTML(content, filename, utils.TEMPLATE_FILE, function (err, html) {
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
