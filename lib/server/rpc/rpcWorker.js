(function(define) {//'use strict'
	define("latte_web/server/rpc/rpcWorker", ["require", "exports", "module", "window"],
 	function(require, exports, module, window) {
 		var latte_lib = require("latte_lib");
 		var RpcWorker = function(config) {
 			this.config = config || {};
 			this.methods = {
 				load : this.load.bind(this)
 			};
 			this.id = 0;
 		};
 		latte_lib.inherits(RpcWorker, latte_lib.events);
 		(function() {
 			this.backData = function(err, result, id) {
              	return {
                	error: err,
	                result : result,
	                id: id
              	};
          	}
 			this.addWorker = function(worker) {
 				var self = this;
 				worker.on("message", function(data, socket) {
 					if(socket) {
		              socket.readable = socket.writeable = true;
		              socket.resume();
		            }

		            if(data.method) {
		              	var method = self.methods[data.method];
		              	
		              	if(method) {
			                if(!latte_lib.isArray(data.params)) {
			                  data.params = [].concat(data.params);
			                }
			                socket && data.params.push(socket);
			                data.params.push(function(err, result, s) {
			         			console.log("rpcWorker ",self.backData(err, result, data.id));
			                    worker.send(self.backData(err, result, data.id), s);
			                });
							try {
								method.apply(worker, data.params);
							}catch(e) {
								console.log(e);
								self.emit("error", e);
							}

		              	}
		            }else if(data.id) {
		              self.emit(data.id, data.error, data.result, socket);
		            }
 				});
 			}
 			this.load = function(path) {
 				var self = this;
				var stat = latte_lib.fs.statSync(path);
				if(stat.isFile()) {
					self.loadFile(path);
				}else if(stat.isDirectory()) {
				 	var files = latte_lib.fs.readdirSync(path);
					files.forEach(function(filename) {
				 		self.load(path + "/" + filename);
				 	});
				}
 			}
 			this.loadFile = function(path) {
 				var self = this;
 				var o;
 				try {
 					o = require(process.cwd() + "/"+path);
 				}catch(err) {
 					if(self.config.log) {
 						var filename = "./logs/loadWebRpc/"+latte_lib.format.dateFormat()+".log";
						latte_lib.fs.writeFile(filename,  latte_lib.getErrorString(err));
 					}else{
 						throw err;
 					}
 					return ;
 				}
 				if(o.master) {
 					self.Set(o.method, o.master);
 				}
 			}
 			this.CallAll = function(method, params, socket, cb) {
 				++this.id
 				process.send({
 					method: "__callAll",
 					params: params,
 					id: this.id
 				}, socket);
 				cb && this.once(this.id, cb);
 			}
 			this.Set = function(method, func) {
	          	this.methods[method] = func;
	        }
 		}).call(RpcWorker.prototype);
 		var rpcWorker = process.latte = new RpcWorker();
 		rpcWorker.addWorker(process);
 		


 	});
})(typeof define === "function"? define: function(name, reqs, factory) {factory(require, exports, module); });
