(function(define) { 'use strict';
	define("latte_web/io/transports/index", ["require", "exports", "module", "window"],
	function(require, exports, module, window) {
		var XHR = require("./polling-xhr")
			, JSONP = require("./polling-jsonp");
		module.exports = exports = {
			polling: polling,
			websocket: require("./websocket")
		};
		exports.polling.upgradesTo = ["websocket"];
		function polling(req) {
			if("string" == typeof req.gets.j) {
				return new JSONP(req);
			} else {
				return new XHR(req);
			}
		}

	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
