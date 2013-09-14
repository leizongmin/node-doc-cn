var config = require('../config');
var db = config.mysql;
var utils = require('./utils');
var check_signin = require('./check_signin');

module.exports = function (app) {
  
  app.get('/signup', function (req, res, next) {
    res.render('signup');
  });

  app.post('/signup', function (req, res, next) {
    var email = req.body.email;
    var password = req.body.password;
    var nickname = req.body.nickname;
    if (!email) return showError('请填写邮箱地址');
    if (!password) return showError('请填写密码');
    if (!nickname) nickname = email.split('@')[0];

    function showError (err) {
      res.locals.email = email;
      res.locals.password = password;
      res.locals.nickname = nickname;
      res.locals.error = err.toString();
      res.render('signup');
    }

    db.selectOne('user_list', '*', '`email`=' + db.escape(email), function (err, user) {
      if (err) return showError(err);
      if (user) return showError('该邮箱地址已注册过了，请选择其它邮箱地址！');

      db.insert('user_list', {
        email:    email,
        password: utils.encryptPassword(password),
        nickname: nickname,
        is_active: 1
      }, function (err) {
        if (err) return showError(err);

        res.redirect('/signin');
      });
    });
  });

  app.get('/signin', function (req, res, next) {
    res.render('signin');
  });

  app.post('/signin', function (req, res, next) {
    var email = req.body.email;
    var password = req.body.password;
    if (!email) return showError('请填写邮箱地址');
    if (!password) return showError('请填写密码');

    function showError (err) {
      res.locals.email = email;
      res.locals.password = password;
      res.locals.error = err.toString();
      res.render('signin');
    }

    db.selectOne('user_list', '*', '`email`=' + db.escape(email), function (err, user) {
      if (err) return showError(err);
      if (!user) return showError('用户不存在');

      if (utils.validatePassword(password, user.password)) {
        var data = utils.encryptData({
          id:  user.id,
          n:   user.nickname
        }, config.signin.secret);
        res.cookie('signin', data, {
          path:   '/',
          maxAge: config.signin.maxAge
        });
        res.redirect(req.query.url || '/api/');
      } else {
        showError('密码不正确');
      }
    });
  });

  app.all('/current_user', check_signin, function (req, res, next) {
    res.json(req.signinUser);
  });

};
