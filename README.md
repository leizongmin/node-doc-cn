Node.js API 中文版在线翻译系统
===========

安装
====

系统环境要求：

+ MySQL 5.x
+ Node.js >= 0.8

```bash
git clone https://github.com/leizongmin/node-doc-cn.git
cd node-doc-cn
cp config.default.js config.js
```

+ 将 `tables.sql` 导入数据库中
+ 修改配置文件 `config.js`

```bash
npm install
node app
```

工作原理
========

Node.js 的 API 文档是使用 Markdown 格式来编写的，这种文档有一个共同特征：每个
段落都是通过一个空行来分割的。

在翻译之前，先通过程序 `tool/import_origin.js` 来读取 `origin/api` 目录下的所有
`.markdown` 文件，并分割为多个段落，存储到数据库中。

每个段落都会根据其内容，用 `md5()` 来生成一个 `hash` 属性，翻译的时候，每条翻译
结果也对应与该段落的 `hash`。

当 Node.js API有更新时，重新分割文档的 `markdown` 文件即可，大多数的段落内容没有
更改，那么仍然能使用旧的翻译结果。


授权
=====

**MIT**