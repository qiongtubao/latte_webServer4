(function(define) { 'use strict';
	define("latte_web/utils", ["require", "exports", "module", "window"],
	function(require, exports, module, window) {
		(function() {
			var latte_lib = require("latte_lib")
				, _self = this;

			this.set = function(res, field, val) {
				if(arguments.length === 3) {
					if(latte_lib.isArray(val)) {
						val = val.map(String);
					}else{
						val = String(val);
					}
					//暂时没设计到设置content-type的程度
					/*if("content-type" == field.toLowerCase() && !/;\scharset*\s*=/.test(val)) {
						var charset = mime.charsets.lookup(val.split(";")[0]);
						if(charset) val += "; charset=" + charset.toLowerCase();
					}*/
					res.setHeader(field, val);
				} else {
					for(var key in field) {
						this.set(res, key, field[key]);
					}
				}
				return res;
			}





			this[302] = function(res, url, body) {
				res.statusCode = 302;
				res.setHeader("Location", url);
				res.setHeader("Content-Length", Buffer.byteLength(body));
				res.end(body);
			}

			

			this.Origin = function(req, res, next) {
				var headers = {};
				if (req.headers.origin) {
			      headers['Access-Control-Allow-Credentials'] = 'true';
			      headers['Access-Control-Allow-Origin'] = req.headers.origin;
			    } else {
			      headers['Access-Control-Allow-Origin'] = '*';
			    }
			    _self.set(res, headers);
			    next && next();
			}
		}).call(module.exports);
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
