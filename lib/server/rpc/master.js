(function(define) {//'use strict'
	define("latte_web/server/rpc/master", ["require", "exports", "module", "window"],
 	function(require, exports, module, window) {
 		var latte_lib = require("latte_lib");
 		var Master = function(config) {
 			this.config = config || {};
 			this.rpc = null;
 			this.watcher = null;
 			this.workers = [];
 			this.sendCaches = [];
 			this.start();
 			this.methods = {
 				__callAll: this.CallAll
 			};
 			this.id = 0;
 			this.msIds = {};
 		};
 		latte_lib.inherits(Master, latte_lib.events);
 		(function() {
 				this.Call = function(worker , method , params, socket, cb) {
 					var id = ++ this.id;
 					if(latte_lib.isFunction(socket)) {
 						cb = socket;
 						socket = null;
 					}
 					worker.send({
 						method: method,
 						params: params,
 						id: id
 					}, socket);
 					cb && this.once(id, cb);
 				}
 				this.CallAll = function(data, socket, cb) {
 					var self = this;
 					if(latte_lib.isFunction(socket)) { cb = socket; socket = null; }
 					if(cb) {
 						var funcs = this.workers.map(function(worker) {
 							return function(callback) {
 								self.Call(worker, data.method, data.params, socket, function(error, data, socket) {
 									callback(null, {
 										error: error,
 										data: data,
 										worker: worker
 									});
 								});
 							}
 						});
 						latte_lib.async.parallel(funcs, function(err, all) {
 							cb(err, all);
 						});
 					}else{
 						this.workers.forEach(function(worker) {
 							self.Call(worker, data.method, data.params, socket);
 						});
 					}

 				}
 			this.start = function() {
 				var Child = require('child_process');
 				this.worker = Child.fork(__dirname+ "/rpcWorker.js");
 				this.worker.on("message" , function(data, socket) {
 					
					console.log("master worker", data);
 					if(data.method && self.methods[data.method]) {
 						if(!latte_lib.isArray(data.params)) {
							data.params = [].concat(data.params);
						}
						socket && data.params.push(socket);
 						self.methods[data.method](data, socket, function() {

 						});
 					}else if(data.id) {
 						var info = self.msIds[data.id];
 						console.log();
 						if(info) {
 							data.id = info.id;
 							info.worker.send(data, socket);
 						}
 					}
 				});
 				this.worker.on("error", function(error) {
 					//假设worker死掉 那么会导致信息返回有问题
 					//是否要记录未返回的信息  重发机制
 					self.worker = null;
 					self.start();
 				});
 				if(this.config.rpcPath) {
 					this.Call(this.worker, "load",  [this.config.rpcPath]);
 				}
 				var self = this;
 				this.sendCaches.forEach(function(o) {
 					self.send(o.data, o.socket);
 				});
 				this.sendCaches = [];
 			}
 			
 			this.send = function(data, socket) {
 				var self = this;
 				if(this.worker) {
					
 					this.worker.send(data, socket);
 				}else{
 					this.sendCaches.push({
 						data: data,
 						socket: socket
 					});
 					//this.worker.send(data, socket);
 				}
 				
 			}
 			
 			this.addWorker = function(worker) {
 				this.workers[worker.id] = worker;
 				var self = this;
 				worker.process.on("message", function(data, socket) {
 					if(socket) {
 						socket.readable = socket.writeable = true;
 						socket.resume();
 					}
 					console.log("master rpc", data);
 					if(data.method) {
 						/**
 						var method = self.methods[data.method];
 						if(method) {
 							if(!latte_lib.isArray(data.params)) {
 								data.params = [].concat(data.params);
 							}
 							socket && data.params.push(socket);
 							data.params.push(function(err, result, s) {
 								worker.send(backData(err, result, data.id), s);
 							});
 							try {
 								method.apply(worker, data.params);
 							}catch(e) {
 								self.emit("error", e);
 							}
 						}
 						*/
 						self.msIds[++self.id] = {
							id: data.id ,
							worker: worker
						};
						data.id = self.id;
 						self.send(data, socket);

 					}else if(data.id) {
 						
 						self.emit(data.id, data.error, data.result, socket);
 					}
 				});
 			}
 			this.removeWorker = function(worker) {
 				var index = this.workers.indexOf(worker);
 				this.workers[index] = null;
 			}
 			
 		}).call(Master.prototype);
 		module.exports = Master;
 	});
})(typeof define === "function"? define: function(name, reqs, factory) {factory(require, exports, module); });
