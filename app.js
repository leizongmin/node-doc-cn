
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http')
var path = require('path');
var ejs = require('ejs');
var config = require('./config');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'html');
  app.engine('html', ejs.__express);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser(config.cookie.secret));
  app.use(app.router);
  app.use('/public', express.static(path.join(__dirname, 'public')));
  app.use(express.errorHandler());
});

require('./routes/view_api')(app);
require('./routes/edit_api')(app);
require('./routes/user')(app);

app.locals.formatTimestamp = function (t) {
  function n2 (v) {
    return v < 10 ? '0' + v : v;
  }
  var d = new Date(t * 1000);
  return d.getFullYear() + '/' + d.getMonth() + '/' + d.getDate() + ' ' +
         d.getHours() + ':' + n2(d.getMinutes());
};

app.locals.config = config;

process.version = config.api.version;

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
