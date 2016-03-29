(function(define) { 'use strict';
	define("latte_web/post/dataParser", ["require", "exports", "module", "window"],
	function(require, exports, module, window) {

			var latte_lib = require("latte_lib")
				, events = latte_lib.events;
			function DataParser(options) {

			};
			latte_lib.inherits(DataParser, events);
			(function() {
				this.write = function(buffer) {
					this.emit("data", buffer);
					return buffer.length;
				}
				this.end = function() {
					this.emit("end");
				}
			}).call(DataParser.prototype);

			module.exports = DataParser;
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
