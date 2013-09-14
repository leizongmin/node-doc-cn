var utils = require('./utils');
var config = require('../config');

// 检查用户是否已登陆
module.exports = function (req, res, next) {

  if (!req.cookies.signin) {
    return res.redirect('/signin?url=' + req.url);
  }

  var data = utils.decryptData(req.cookies.signin, config.signin.secret);
  if (data && data.id) {
    req.signinUser = {
      id:       data.id,
      nickname: data.n
    };
    next();
  } else {
    res.redirect('/signin?url=' + req.url);
  }

};