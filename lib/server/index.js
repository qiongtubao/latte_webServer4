/**	
	此版本先不支持中央监控文件改变 而是子进程
*/

	var Cluster = require("cluster")
 			, latte_lib = require("latte_lib")
 			, Rpc = Cluster.isMaster ? require("./rpc/master") : require("./rpc/slave")
 			, Querystring = require("querystring")
 			, Domain = require("domain")
 			, Path = require("path")
 			, Url = require("url")
 			, Mines = require("../mines")
			, Post = require("../post")
			, Fs = latte_lib.fs
			, Io = require("./io");
			var defaultConfig = {};
				(function() {
						/**
							@property  {Int} cpus
							@type Int
						*/
						this.cpus = require("os").cpus().length;
						/**
							@property  {Int} shedulingPolicy
							@type Int
						*/
						this.shedulingPolicy = Cluster.SCHED_RR;
						/**
							@property {Int} port
							@type Int
						*/
						this.port = 10086;
						/**
							@property {String} path
							@type String
							@default "html/"
						*/
						this.path = "html/";
						/**
							@property {String} uploadDir
							@type String
						*/
						this.uploadDir = "tmp/";
						/**
							@property {Object} proxys
							@type {Object}
						*/
						this.proxys = {};
						/**
							@property {Boolean} nginx
							@type {Boolean}
							@default false
						*/
						this.nginx = false;
						/**
							@property {Boolean} cache
							@type {Boolean}
							@default false
						*/
						this.cache = false;
						/**
							@property {Boolean} gzip
							@type {Boolean}
							@default false
						*/
						this.gzip = false;
						/*
							@property {Boolean} memoryFile
							@type {Boolean}
							@default false
						*/
						//this.memoryFile = false;
						/**
							@property {Boolean} log
							@type {Boolean}
							@default false
						*/
						this.log = false;
						/**
						 * @property {} type
							 @type {String}
							 @default http
						 */
						this.type = "http";
				}).call(defaultConfig);
				var getErrorString = function(err) {
					if(err.stack) {
						return err.stack.toString();
					}else if(latte_lib.isString(err)) {
						return err.toString();
					}else{
							var errorString;
							try {
									errorString = JSON.stringify(err);
							}catch(e){
									var Util = require("util");
									errorString = Util.inspect(err);
							}
							return errorString;
					}
				}
			var Server = function(config) {
	 			this.config = latte_lib.merger(defaultConfig, config);
	 			if(!Cluster.isMaster) {
	 				var Web = require("./web")
	 					, Io = require("./io")
	 					, Static = require("./static")
	 					, Proxy = require("./proxy")
	 					, Status = require("./status");
	 				this.web = new Web(this.config.web, this);
	 				this.ios = new Io(this.config.io, this);
	 				this.staticWeb = new Static(this.config.staticWeb, this);
	 				this.proxyWeb = new Proxy(this.config.proxy, this);
	 				this.status = new Status(this.config.status, this);
	 			}
	 			
	 			this.rpc = new Rpc(this.config.rpc, this);
				var self = this;
	 			this.cache = {};
				//this.workers = [];
				this.httpCount = 0;
	 		};
	 		latte_lib.inherits(Server, latte_lib.events);
	 		(function() {

	 				this.addRpcClient = function(worker) {
	 					//this.workers.push(worker);
	 					this.rpc.addWorker(worker);
	 				}
	 				this.createWebWorker= function () {
	 					var worker = Cluster.fork();
	 					this.emit("start", worker);
	 					this.addRpcClient(worker);
	 					return worker;
	 				}


	 					this.onRequest = function(req, res) {
	 						var self = this;
	 						var url = Url.parse(req.url);
	 						var pathname = decodeURIComponent(url.pathname);

 							this.httpCount++;
 							res.on("close", function() {
	 							self.httpCount--;
	 							if(self.httpCount == 0) {
	 								self.emit("noChannel");
	 							}
	 						});
	 						/**
	 						if(self.ios && self.ios.all[pathname]) {
	 							req.gets = Querystring.parse(url.query);
	 							self.ios.all[pathname].handleRequest(req, res);
	 							return;
	 						}
	 						**/
	 						
	 						
	 						var fns = [
	 							self.ios.request.bind(this.ios),
	 							self.web.request.bind(this.web),
	 							self.staticWeb.request.bind(this.staticWeb),
	 							self.proxyWeb.request.bind(this.proxyWeb),
	 							self.status[404].bind(this.status)
	 						].map(function(fn) {
	 							return function(callback) {
	 								fn(pathname, req, res, callback);
	 							}
	 						});
	 						latte_lib.async.series(fns, function(err, result) {
								//this.state.send("404", req, res);
							});
	 						
	 						//utils.noFind(pathname, req, res);
	 					}	
	 					this.onUpgrade = function(req, socket, head) {
	 						this.ios.handleUpgrade(req, socket, head);
	 						
	 					}

	 				this._run = function() {
	 					var self = this
	 						, serverDomain = Domain.create();
	 					serverDomain.on("error", function(err) {
	 						if(process.latte && process.latte.debug) {
	 							throw err;
	 						}else{
	 							var filename = "./logs/otherError/"+latte_lib.format.dateFormat()+".log";
								latte_lib.fs.writeFile(filename, getErrorString(err));
								self.emit("error", err);
	 						}
	 					});
	 					serverDomain.run(function() {
	 						var Http = require(self.config.type);
	 						var server = self.server = Http.createServer(function(req, res) {
	 							var reqd = Domain.create();
	 							reqd.on("error", function(err) {
	 								res.setHeader("Content-Type", "text/plan");
	 								res.end(getErrorString(err));
	 								if(process.latte && process.latte.debug) {
	 									throw err;
	 								}else{
	 									var filename = "./logs/webError/" + latte_lib.format.dateFormat() + ".log";
										latte_lib.fs.writeFile(filename, [
												req.url ,
												"gets:" + latte_lib.format.jsonFormat(req.gets),
											  "posts:" + latte_lib.format.jsonFormat(req.posts),
											 	getErrorString(err)
											].join("\n")
										);
	 								}
	 							});
	 							reqd.run(function() {
		 							self.onRequest(req, res);
		 						});
	 						});
	 						server.timeout = self.config.timeout;
	 						server.on("upgrade", function(req, socket, head) {
	 							self.onUpgrade(req, socket, head);
	 						});

	 						server.listen(self.config.port, function() {
		 						latte_lib.debug.info(self.config.port, "start");
		 					});
	 					});
	 				}
	 				this._stop = function(callback) {
	 					
	 					this.server.once("close" , function() {
	 						console.log("server slave stop", Cluster.worker.id);
	 						
	 						process.exit(0);
	 					});
	 					this.server.close();
	 					callback(null, Cluster.worker.id);

	 				}

	 			this.run = function() {
	 				if(this.server) { return; }
	 				if(Cluster.isMaster) {
	 					var self = this;
	 					for(var i = 0, len = this.config.cpus; i < len ;i++) {
	 						self.createWebWorker();
	 					}

	 					Cluster.on("exit", function(worker) {
	 						self.rpc.removeWorker();
	 						if(self.config.restart) {
 								var now = self.createWebWorker();
 								self.emit("restart", worker, now);
	 						}
	 					});
	 					
	 					
	 				}else{
	 					this._run();
	 				}
	 			}

	 			this.doSlave = function(fn) {
	 				if(!Cluster.isMaster) {
	 					fn();
	 				}
	 			}
	 			this.doMaster = function(fn) {
	 				if(Cluster.isMaster) {
	 					fn();
	 				}
	 			}
	 			this.io = function(path, opts, fn) {
 					if(!this.config.nginx && this.config.cpus != 1) {
 						throw new Error("you config error about");
 					}
 					return this.ios.add(path, opts, fn);
 				}
	 		}).call(Server.prototype);
	module.exports = Server;