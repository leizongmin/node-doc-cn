
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http')
var path = require('path');
var fs = require('fs');
var api2HTML = require('./tools/html');
var api2JSON = require('./tools/json');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use('/public', express.static(path.join(__dirname, 'public')));
  app.use(express.errorHandler());
});

app.get('/api/:name.:type', function (req, res, next) {
  var name = req.params.name;
  var type = req.params.type;

  if (name === 'index') name = '_toc';

  var filename = path.resolve(__dirname, 'api-en', name + '.markdown');
  fs.readFile(filename, 'utf8', function (err, content) {
    if (err) return next(err);
    if (type === 'html') {
      api2HTML(content, filename, path.resolve(__dirname, 'tools/template.html'), function (err, html) {
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

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
