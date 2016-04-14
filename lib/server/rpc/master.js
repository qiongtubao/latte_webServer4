(function(define) {//'use strict'
	define("latte_web/server/rpc/master", ["require", "exports", "module", "window"],
 	function(require, exports, module, window) {
 		var latte_lib = require("latte_lib");
 		/**
 			methods里方法的执行者是worker 

 			@class Master


 		*/
 		var Master = function(config, server) {
 			this.config = config || {};
 			this.rpc = null;
 			this.watcher = null;
 			this.workers = [];
 			this.sendCaches = [];
 			this.start();
 			this.methods = {
 				__callAll: require("./master/callAll").master	
 			};
 			this.id = 0;
 		};
 		latte_lib.inherits(Master, latte_lib.events);
 		(function() {
 				this.CallAll = function(method, params, socket, cb){
 					if(latte_lib.isFunction(socket)) {
 						cb = socket;
 						socket = null;
 					}
 					var self = this;
 					var funcs = [];

 					this.workers.forEach(function(worker) {
 						if(!worker) {
 							return;
 						}
 						funcs.push(function(callback) {
 							console.log("send");
 							self.Call(worker, method, params, socket, callback);
 						});
 					});

 					latte_lib.async.parallel(funcs, function(err, data) {
 						console.log("callbackAll");
 						cb(err, data);
 					});
 				}
 				/**
 					发送给进程消息
 					@method Call
 					@param worker {Cluster Worker} or {Child_Process}
 					@param method {Function}
 					@param params {Array}
 					@param Socket {socket}
 					@param cb {Function}
 				*/
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


 			this.restart = function() {
 				this.close();
 				this.start();
 			}
 			/**
 				关闭rpc 通讯进程
 				@method rpcClose 

 			*/
 			this.close= function() {
 				if(!this.worker) {
 					return;
 				}
 				this.worker.kill('SIGHUP');
 				this.worker = null;
 			}
 			/**
 				创建rpc通讯进程
 				@method start
 			*/
 			this.start = function() {
 				var self = this;
 				var Child = require('child_process');
 				this.worker = Child.fork(__dirname+ "/rpcWorker.js");
 				this.worker.on("message" , function(data, socket) {
 					if(data.method ) {
 						if(self.methods[data.method]) {
 							if(!latte_lib.isArray(data.params)) {
								data.params = [].concat(data.params);
							}
							socket && data.params.push(socket);
	 						self.methods[data.method].call(self,  data, socket);
 						}else{
 							console.log(data.method, "no next");
 							//self.send({worker, data.method, data.params, socket, function(err, result, s) {
 							//	worker.send(backData(err, result, data.id), s);
 							//});
 						}
 						
 					}else if(data.id) {
 						/**
 						var info = self.msIds[data.id];
 						
 						if(info) {
 							data.id = info.id;
 							info.worker.send(data, socket);
 						}
 						*/
 						self.emit(data.id, data.error, data.result, socket);
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
 				this.sendCaches.forEach(function(o) {
 					self.send(o.data, o.socket);
 				});
 				this.sendCaches = [];
 			}
 			/**
 				@method send
 				@param data {JSON}
 				@param socket {Socket}
 			*/
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
 				/**
 					@method backData
 					@param err {String}||{Json}
 					@param result {Json}
 					@param id {Int}
 					@return {JSON}
 				*/
 				var backData = function(err, result, id) {
	              	return {
	                	error: err,
		                result : result,
		                id: id
	              	};
	          	}
	        /**
	        	添加slave
	        	@method addWorker
	        	@param worker
				
	        */
 			this.addWorker = function(worker) {
 				
 				this.workers[worker.id] = worker;
 				var self = this;
 				worker.rpc = this;
 				worker.process.on("message", function(data, socket) {
 					if(socket) {
 						socket.readable = socket.writeable = true;
 						socket.resume();
 					}
 					console.log("master rpc", data);
 					if(data.method) {
 						
						//内置函数  直接执行
						if(self.methods[data.method]) {

							if(!latte_lib.isArray(data.params)) {
 								data.params = [].concat( data.params);
 							}
 							socket && data.params.push(socket);
 							data.params.push(function(err, result, s) {
 								worker.send(backData(err, result, data.id), s);
 							});
 							try {
 								
 								self.methods[data.method].apply(worker, data.params);
 							}catch(e) {
 								self.emit("error", e);
 							}
							
						}else {
							//非内置函数  发送给Rpc进程处理
							self.Call(self.worker, data.method, data.params, socket, function(error, result, s) {
								worker.send(backData(error, result, data.id), s);
							});
						}
						
 					}else if(data.id) {
 						
 						self.emit(data.id, data.error, data.result, socket);
 					}
 				});
 			}
 			/**
 				@method removeWorker
				@param worker {Worker}
 			*/
 			this.removeWorker = function(worker) {
 				var index = this.workers.indexOf(worker);
 				this.workers[index] = null;
 			}
 			
 		}).call(Master.prototype);
 		module.exports = Master;
 	});

})(typeof define === "function"? define: function(name, reqs, factory) {factory(require, exports, module); });
