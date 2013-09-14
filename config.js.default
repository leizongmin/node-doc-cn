// 服务器端口
exports.port = 3000;

// Cookie
exports.cookie = {
  secret: 'node',
  maxAge: 3600000 * 24 * 30
};

// 登陆字符串加密
exports.signin = {
  secret: 'xxxxx',
  maxAge: 3600000 * 24 * 30
};

// MySQL数据库连接
var MySQLPool = require('./lib/mysql');
exports.mysql = new MySQLPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'nodeapi',
  pool: 10
});

// 当前文档版本
exports.api = {
  version: 'v0.10.18'
};
