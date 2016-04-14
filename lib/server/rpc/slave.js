(function(define) {//'use strict'
	define("latte_web/server/rpc/slave", ["require", "exports", "module", "window"],
 	function(require, exports, module, window) {
 		var latte_lib = require("latte_lib")
 			, Cluster = require("cluster");
 		var Slave = function(config, server) {
 			this.config = config || {};
 			//restart: server.restart.bind(server)
 			this.methods = {
 				stop: require("./slave/stop").slave,
 				addWebFile: require("./slave/addWebFile").slave
 			};
 			this.server = server;
 			this.id = 0;
 			this.addWorker(Cluster.worker);
 			var self = this;
 			if(this.config.rpcPath) {
 				this.config.rpcPath.forEach(function(path) {
 					self.load(path);
 				});
 			}
 		};
 		latte_lib.inherits(Slave, latte_lib.events);
 		(function() {
 				this.loadFile = function(path) {
 					var self = this;
	 				var o;
	 				try {
	 					o = require(process.cwd()+"/"+path);
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
	 					self.Set(o.method, o.slave);
	 				}
 				}
 				this.Set = function(method, func) {
		          this.methods[method] = func;
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
 			this.addWorker = function(worker) {
 				this.worker = worker;
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
 								worker.send(self.backData(err, result, data.id), s);
 							});
 							try {
 								method.apply(self, data.params);
 							}catch(e) {
 								self.emit("error", e);
 							}
 						}
 					}else if(data.id){
 						self.emit(data.id, data.error, data.result, socket);
 					}
 				});
 			}
 			this.Call = function(method, params, socket, cb) {
	          var self = this;
	          if(latte_lib.isFunction(socket)) {
	            cb = socket;
	            socket = null;
	          }
	          this.write({
	            method: method,
	            params: params,
	            id: ++self.id
	          }, socket);
	          if(cb) {
	            this.once(self.id, cb);
	          }
	        }
	        this.CallAll = function(method, params, socket, cb) {
	        	var self = this;
	        	if(latte_lib.isFunction(socket)) {
	        		cb = socket;
	        		socket = null;
	        	}

	        	this.write({
	        		method: "__callAll",
	        		params: [{
	        			method: method,
	        			params: params
	        		}],
	        		id: ++self.id
	        	}, socket);

	        	if(cb) {
	        		this.once(self.id, cb);
	        	}
	        }
 			this.write = function(data, handle) {
 				this.worker.process.send(data, handle);
 			}
 			this.Set = function(method, func) {
	          	this.methods[method] = func;
	        }
	        this.backData = function(err, result, id) {
              	return {
	                error: err,
	                result : result,
	                id: id
             	};
          	}
 		}).call(Slave.prototype);
 		module.exports = Slave;
 	});

})(typeof define === "function"? define: function(name, reqs, factory) {factory(require, exports, module); });
