(function(define) { 'use strict';
	define("latte_web/utils", ["require", "exports", "module", "window"],
	function(require, exports, module, window) {
		(function() {
			var latte_lib = require("latte_lib")
				, _self = this;

			




			this[302] = function(res, url, body) {
				res.statusCode = 302;
				res.setHeader("Location", url);
				res.setHeader("Content-Length", Buffer.byteLength(body));
				res.end(body);
			}




			this.codesHtmls = {};
			this.setHtml = function(code, ) {

			}


			
		}).call(module.exports);
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
