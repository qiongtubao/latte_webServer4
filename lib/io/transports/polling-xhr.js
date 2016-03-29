(function(define) { 'use strict';
	define("latte_web/io/transports/polling-jsonp", ["require", "exports", "module", "window"],
	function(require, exports, module, window) {
		var Polling = require("./polling")
			, latte_lib = require("latte_lib");
		module.exports = XHR;
		function XHR(req) {
			Polling.call(this, req);
		};
		latte_lib.inherits(XHR, Polling);
		(function() {
			this.onRequest = function(req) {
				if("OPTIONS" == req.method) {
					var res = req.res;
					var headers = this.headers(req);
					headers["Access-Control-Allow-Headers"] = "Content-Type";
					res.writeHead(200, headers);
					res.end();
				} else {
					Polling.prototype.onRequest.call(this, req);
				}
			}
			this.doWrite = function(data) {
				var isString = typeof data == 'string';
				var contentType = isString
					? 'text/plain; charset=UTF-8'
					: 'application/octet-stream';
				var contentLength = '' + (isString ? Buffer.byteLength(data) : data.length);

				var headers = {
					'Content-Type': contentType,
					'Content-Length': contentLength
				};

				// prevent XSS warnings on IE
				// https://github.com/LearnBoost/socket.io/pull/1333
				var ua = this.req.headers['user-agent'];
				if (ua && (~ua.indexOf(';MSIE') || ~ua.indexOf('Trident/'))) {
					headers['X-XSS-Protection'] = '0';
				}

				this.res.writeHead(200, this.headers(this.req, headers));
				this.res.end(data);
			}
			this.headers = function(req, headers) {
				headers = headers || {};

				if (req.headers.origin) {
					headers['Access-Control-Allow-Credentials'] = 'true';
					headers['Access-Control-Allow-Origin'] = req.headers.origin;
				} else {
					headers['Access-Control-Allow-Origin'] = '*';
				}

				this.emit('headers', headers);
				return headers;
			}
		}).call(XHR.prototype);
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
