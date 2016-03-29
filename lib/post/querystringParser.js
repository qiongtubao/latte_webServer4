(function(define) { 'use strict';
	define("latte_web/post/querystringParser", ["require", "exports", "module", "window"],
	function(require, exports, module, window) {


				var Querystring = require("querystring");
				function QuerystringParser() {
					this.buffer = "";
				};
				(function() {
					this.write = function(buffer) {
						this.buffer += buffer.toString("ascii");
						return buffer.length;
					}
					this.end = function() {
						var fields = Querystring.parse(this.buffer);
						for(var field in fields) {
							this.onField(field, fields[field]);
						}
						this.buffer = "";
						this.onEnd();
					}
				}).call(QuerystringParser.prototype);
				module.exports = QuerystringParser;

	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
