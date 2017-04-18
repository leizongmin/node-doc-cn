# URL

    Stability: 3 - Stable

此模块包含用于解析和分析URL的工具。可通过`require('url')`使用他们。

解析后的URL对象包含下述部分或全部字段，具体包含哪些字段取决于解析前的URL字符串中是否存在这些字段。在原始的URL字符串中不存在的字段在解析后的对象中也不会存在。以下面这个URL为例

`'http://user:pass@host.com:8080/p/a/t/h?query=string#hash'`

* `href`: 带解析的完整的原始URL字符串。protocol 和 host 都是小写形式。

    案例： `'http://user:pass@host.com:8080/p/a/t/h?query=string#hash'`

* `protocol`: 请求所采用的协议，小写。

    案例： `'http:'`

* `host`: URL中关于主机的完整信息 -- 小写，包括端口信息。

    案例： `'host.com:8080'`

* `auth`: The authentication information portion of a URL.

    案例： `'user:pass'`

* `hostname`: Just the lowercased hostname portion of the host.

    案例： `'host.com'`

* `port`: 主机信息中的端口部分。

    案例： `'8080'`

* `pathname`: The path section of the URL, that comes after the host and
  before the query, including the initial slash if present.

    案例： `'/p/a/t/h'`

* `search`: The 'query string' portion of the URL, including the leading
  question mark.

    案例： `'?query=string'`

* `path`: Concatenation of `pathname` and `search`.

    案例： `'/p/a/t/h?query=string'`

* `query`: Either the 'params' portion of the query string, or a
  querystring-parsed object.

    案例： `'query=string'` or `{'query':'string'}`

* `hash`: URL中的锚点部分，包含前导的'#'。The 'fragment' portion of the URL including the pound-sign.

    案例： `'#hash'`

URL模块提供了如下方法：

## url.parse(urlStr, [parseQueryString], [slashesDenoteHost])

以一个 URL字符串为参数，返回一个解析后的对象。

如传递的第二个参数为`true`，则会使用 `querystring`模块解析URL中的查询字符串。
默认是`false`。

传递 `true` 作为第三个参数，会将 `//foo/bar` 当做
`{ host: 'foo', pathname: '/bar' }` ，而不是
`{ pathname: '//foo/bar' }`。默认是 `false`。

## url.format(urlObj)

以一个解析后的URL对象为参数，返回格式化的URL字符串。

* `href` will be ignored.
* `protocol`is treated the same with or without the trailing `:` (colon).
  * The protocols `http`, `https`, `ftp`, `gopher`, `file` will be
    postfixed with `://` (colon-slash-slash).
  * All other protocols `mailto`, `xmpp`, `aim`, `sftp`, `foo`, etc will
    be postfixed with `:` (colon)
* `auth` will be used if present.
* `hostname` will only be used if `host` is absent.
* `port` will only be used if `host` is absent.
* `host` will be used in place of `hostname` and `port`
* `pathname` is treated the same with or without the leading `/` (slash)
* `search` will be used in place of `query`
* `query` (object; see `querystring`) will only be used if `search` is absent.
* `search` is treated the same with or without the leading `?` (question mark)
* `hash` is treated the same with or without the leading `#` (pound sign, anchor)

## url.resolve(from, to)

Take a base URL, and a href URL, and resolve them as a browser would for
an anchor tag.  Examples:
指定一个默认URL地址，和一个链接的目标URL地址，返回链接的绝对URL地址。处理方式与浏览器处理锚点标签的方法一致。

    url.resolve('/one/two/three', 'four')         // '/one/two/four'
    url.resolve('http://example.com/', '/one')    // 'http://example.com/one'
    url.resolve('http://example.com/one', '/two') // 'http://example.com/two'
