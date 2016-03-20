(function(define) {//'use strict'
	define("latte_web/server/rpc/slave", ["require", "exports", "module", "window"],
 	function(require, exports, module, window) {
 		var Slave = function() {

 		};
 		(function() {
 			this.send = function(type, data) {
 				process.send({
 					type: type, 
 					data: data
 				});
 			}
 		}).call(Slave.prototype);
 		module.exports = Slave;
	});
})(typeof define === "function"? define: function(name, reqs, factory) {factory(require, exports, module); });
