/**
 * MySQL Pool
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var util = require('util');
var events = require('events');
var mysql = require('mysql');
var debug = require('debug')('api:mysql');

exports = module.exports = MySQLPool;


/**
 * 创建MySQL连接池
 *
 * @param {Object} options
 *  - {String} host       主机地址
 *  - {Number} port       端口
 *  - {Number} database   数据库名
 *  - {String} user       用户名
 *  - {String} password   密码
 *  - {Number} pool       连接池大小
 */
function MySQLPool (options) {
  options = options || {};
  if (!options.host)          throw new Error('Invalid host.');
  if (!(options.port > 0))    throw new Error('Invalid port.');
  if (!options.database)      throw new Error('Invalid database.');
  if (!options.user)          throw new Error('Invalid user.');
  if (!(options.pool > 0))    throw new Error('Invalid pool number.');
  this._options = options;

  var pool = this._pool = mysql.createPool({
    host:             options.host,
    port:             options.port,
    database:         options.database,
    user:             options.user,
    password:         options.password,
    connectionLimit:  options.pool
  });
}

// 继承EventEmitter
util.inherits(MySQLPool, events.EventEmitter);

/**
 * 执行查询
 *
 * @param {String} sql
 * @param {Array} params
 * @param {Function} callback
 */
MySQLPool.prototype.query = function () {
  var args = Array.prototype.slice.call(arguments);
  var len = args.length;
  var callback = args[len - 1];
  
  this._pool.getConnection(function(err, conn) {
    if (err) return callback(err);
    
    args[len - 1] = function (err) {
      conn.release();
      callback.apply(null, arguments);
    };
    debug('query: %s %s', args[0], args.slice(1, -1));
    conn.query.apply(conn, args);
  });
};

/**
 * MySQL字符串转义
 *
 * @param {String} value
 * @return {String}
 */
MySQLPool.prototype.escape = function (value) {
  return SqlStringEscape(value, false, this._options.timezone);
};

/**
 * 插入数据
 *
 * @param {String} table
 * @param {Object|Array} data
 * @param {Function} callback
 */
MySQLPool.prototype.insert = function (table, data, callback) {
  var me = this;
  if (!Array.isArray(data)) data = [data];
  if (!(data[0] && typeof data[0] === 'object')) {
    return callback(new Error('Bad data format.'));
  }

  // 取完整的键名
  var fileds = {};
  data.forEach(function (item) {
    for (var i in item) {
      if (!fileds[i]) fileds[i] = true;
    }
  });
  fileds = Object.keys(fileds);

  // 生成数据列表
  var values = [];
  data.forEach(function (item) {
    var line = [];
    fileds.forEach(function (f) {
      line.push(item[f] || '');
    });
    values.push(line);
  });

  // 生成SQL
  var fileds = fileds.map(function (f) {
    return '`' + f + '`';
  });
  var values = values.map(function (line) {
                 return '(' + line.map(function (v) {
                    return me.escape(v);
                 })
                 .join(',') + ')';
               })
               .join(',\n');
  var sql = 'INSERT INTO `' + table + '`(' + fileds + ') VALUES\n' + values;

  me.query(sql, callback);
};

/**
 * 更新数据库
 *
 * @param {String} table
 * @param {String} where
 * @param {Object} data
 * @param {Function} callback
 */
MySQLPool.prototype.update = function (table, where, data, callback) {
  if (typeof where !== 'string') {
    return callback(new Error('Condition must be a string.'));
  }
  if (!(data && typeof data === 'object')) {
    return callback(new Error('Data must be an object.'));
  }

  var set = [];
  for (var i in data) {
    set.push('`' + i + '`=' + this.escape(data[i]));
  }
  var sql = 'UPDATE `' + table + '` SET ' + set.join(',') + ' WHERE ' + where;

  this.query(sql, callback);
};

/**
 * 删除
 *
 * @param {String} table
 * @param {String} where
 * @param {Function} callback
 */
MySQLPool.prototype.delete = function (table, where, callback) {
  if (typeof where !== 'string') {
    return callback(new Error('Condition must be a string.'));
  }

  var sql = 'DELETE FROM `' + table + '` WHERE ' + where;

  this.query(sql, callback);
};

/**
 * 查询
 *
 * @param {String} table
 * @param {String} fields
 * @param {String} where
 * @param {String} tail   可选
 * @param {Function} callback
 */
MySQLPool.prototype.select = function (table, fields, where, tail, callback) {
  if (typeof tail === 'function') {
    callback = tail;
    tail = '';
  }

  var sql = 'SELECT ' + fields + ' FROM `' + table + '` WHERE ' + where + ' ' + tail;

  this.query(sql, callback);
};

/**
 * 仅查询一条
 *
 * @param {String} table
 * @param {String} fields
 * @param {String} where
 * @param {String} tail
 * @param {Function} callback
 */
MySQLPool.prototype.selectOne = function (table, fields, where, tail, callback) {
  if (typeof tail === 'function') {
    callback = tail;
    tail = '';
  }

  if (tail.toLowerCase().indexOf('limit ') === -1) {
    tail += ' LIMIT 1';
  }

  this.select(table, fields, where, tail, function (err, list) {
    if (err) return callback(err);
    callback(null, list && list[0]);
  });
};

/**
 * 返回当前时间戳
 *
 * @return {Number}
 */
MySQLPool.prototype.timestamp = function () {
  return parseInt(Date.now() / 1000, 10);
};


/**
 * MySQL字符串转义（取自mysql模块lib/protocol/SqlString.js
 */
function SqlStringEscape (val, stringifyObjects, timeZone) {
  if (val === undefined || val === null) {
    return 'NULL';
  }

  switch (typeof val) {
    case 'boolean': return (val) ? 'true' : 'false';
    case 'number': return val+'';
  }

  if (val instanceof Date) {
    val = SqlString.dateToString(val, timeZone || "Z");
  }

  if (Buffer.isBuffer(val)) {
    return SqlString.bufferToString(val);
  }

  if (Array.isArray(val)) {
    return SqlString.arrayToList(val, timeZone);
  }

  if (typeof val === 'object') {
    if (stringifyObjects) {
      val = val.toString();
    } else {
      return SqlString.objectToValues(val, timeZone);
    }
  }

  val = val.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(s) {
    switch(s) {
      case "\0": return "\\0";
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\b": return "\\b";
      case "\t": return "\\t";
      case "\x1a": return "\\Z";
      default: return "\\"+s;
    }
  });
  return "'"+val+"'";
}