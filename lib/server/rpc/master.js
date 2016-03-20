(function(define) {//'use strict'
	define("latte_web/server/rpc/master", ["require", "exports", "module", "window"],
 	function(require, exports, module, window) {
 		var Child = require("child_process");
 		var Master = function() {
 			var work= child.fork(Path.join(__dirname,"./client.js"));
			work.on("message", function(m) {
				
			});
			work.on("error", function() {
				createWork(work.id);
			});
			work.send({
				type: "start",
				config: config
			});
			this.client = work;
 		};
 		(function() {
 			this.load = function(rpcPath) {
 				if(this.work) {
					return cosole.log("work "); 					
 				}

 				this.events = new lattte_lib.events();
 				this.work = child.fork(Path.join(__dirname, "./client.js"));
 				this.work.on("message", function(data) {
 					self.events.emit(data.type, data.data);
 				});
 				this.work.send({
 					type: "load",
 					data: "client.js"
 				});
 			}
 		}).call(Master.prototype);
 		module.exports = Master;
	});
})(typeof define === "function"? define: function(name, reqs, factory) {factory(require, exports, module); });
