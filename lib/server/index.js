(function(define) {//'use strict'
	define("latte_web/server/index", ["require", "exports", "module", "window"],
 	function(require, exports, module, window) {
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
			, Ios = require("../io");
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
			var Server = function(config) {
	 			this.config = latte_lib.merger(defaultConfig, config);

	 			if(this.config.webPath && !latte_lib.isArray(this.config.webPath)) {
					this.config.webPath = [this.config.webPath];
				}
				if(this.config.rpc.rpcPath && !latte_lib.isArray(this.config.rpc.rpcPath)) {
					this.config.rpc.rpcPath = [this.config.rpc.rpcPath];
				}
	 			this.gets = {};
	 			this.posts = {};
	 			this.getRegs = [];
	 			this.postRegs = [];
	 			this.befores = [];
	 			this.afters = [];
	 			this.rpc = new Rpc(this.config.rpc, this);
				var self = this;
	 			this.cache = {};

				this.workers = [];
				this.httpCount = 0;
	 		};
	 		latte_lib.inherits(Server, latte_lib.events);
	 		(function() {
	 				this.doMaster = function(fn) {
	 					if(Cluster.isMaster) {
	 						fn();
	 					}
	 				}
	 				this.doSlave = function(fn) {
	 					if(!Cluster.isMaster) {
	 						fn();
	 					}
	 				}
	 					/**
	 						@method before
	 						@param fn {Function}
	 					*/
		 				this.before = function(fn) {
		 					if(latte_lib.isFunction(fn)) {
								this.befores.push(fn);
							}
		 				}
		 				/**
	 						@method after
	 						@param fn {Function}
	 					*/
		 				this.after = function(fn) {
		 					if(latte_lib.isFunction) {
		 						this.afters.push(fn);
		 					}
		 				}
		 				/**
		 					@method use
		 					@param opts.before {Function}
		 					@param opts.after {Function}
		 				*/
		 				this.use = function(opts) {
							this.before(opts.before.bind(opts));
							this.after(opts.after.bind(opts));
						}
						/**
							@method get
							@param path {String}
							@param func {Function}
						*/
						/**
							@method post
							@param path {String}
							@param func {Function}
						*/
						var _self = this;
						["get", "post"].forEach(function(type) {
								_self[type] = function(path) {
									var args = Array.prototype.slice.call(arguments);
									args.unshift(type);
									_self.set.apply(this, args);
								}
						});
						/**
							@method set
							@param type {String}
							@param path {String}
						*/
						this.set = function(type, path) {
							var self = this;
							var handles = Array.prototype.slice.call(arguments, 2);
							handles.forEach(function(fn) {
								if(!latte_lib.isFunction(fn)) {
									throw new Error(path + "," + type + "handle has not function !!")
								}
							});
							if(this[type + "s"]) {
								this[type+"s"][path] = function(req, res) {
									var fns = handles.map(function(fn) {
											return function(callback) {
												fn.call(self, req, res, callback);
											}
									});
									latte_lib.async.series(fns, function(err, result) {
											if(err) {
												res.end(err);
											}
									});
								}
							}
						}
	 				this.getIo = function(path) {
	 					return this.ios.get(path);
	 				}
	 				this.io = function(path, opts, fn) {
	 					this.ios = this.ios || new Ios();
	 					if(!this.config.nginx && this.config.cpus != 1) {
	 						throw new Error("you config error about");
	 					}
	 					return this.ios.add(path, opts, fn);
	 				}
	 					this.loadFile = function(path) {
	 						var self = this;
	 						if(Path.extname(path) != ".js") { return ;} ; 
	 						try {
	 							o = require(process.cwd()+"/"+path);
	 						}catch(err) {
	 							if(self.config.log) {
										var filename = "./logs/loadWeb/"+latte_lib.format.dateFormat()+".log";
										latte_lib.fs.writeFile(filename,  latte_lib.getErrorString(err));
								}else{
										throw err;
								}
								return ;
	 						}
	 						if(o.get) {
								var args = [o.path];
								if(latte_lib.isArray(o.get)) {
									args = args.concat(o.get);
								}else{
									args.push(o.get);
								}
								self.get.apply(this, args);
							}
							if(o.post) {
								var args = [o.path];
								if(latte_lib.isArray(o.post)) {
									args = args.concat(o.post);
								}else{
									args.push(o.post);
								}
								self.post.apply(this, args);
							}
	 					}
	 				this.loadWeb = function(path) {
	 					var self = this;
	 					var stat = latte_lib.fs.statSync(path);
	 					if(stat.isFile()) {
	 						self.loadFile(path);
	 					}else if(stat.isDirectory()) {
 						 	var files = latte_lib.fs.readdirSync(path);
	 						files.forEach(function(filename) {
						 		self.loadWeb(path + "/" + filename);
						 	});
	 					}

	 				}

	 					/**
	 						查找文件
	 						@method path
	 						@param path
	 						@param callback
	 					*/
	 						this.findFile = function(path, callback) {
	 							var self = this;
								var last = path.slice(-1);
								if(last == "/" || last == "\\") {
									var indexs = this.config.indexs || ["index.html"];
									var funs = indexs.map(function(obj) {
										return function(cb) {
											var p = path + obj;
											latte_lib.fs.exists(p, function(exist) {
												if(exist) {
													return cb(p);
												}
												cb();
											});
										}
									});
									latte_lib.async.series(funs, function(file) {
										callback(file);
									});
								} else {
									latte_lib.fs.exists(path, function(exist) {
										if(exist) {

											var stat = latte_lib.fs.lstatSync(path);
											if(stat.isFile() || stat.isSymbolicLink()) {
												return callback(path);
											}else{
												return self.findFile(path+"/", callback);
											}
											//return callback(path);
										}
										callback();
									});
								}
	 						}
	 					this.staticFile = function(pathname, req, res) {
	 						var self = this
	 							, paths = pathname.split("/")
	 							, proxy = this.config.proxys[paths[1]]
	 							, mpath;
	 						if(proxy) {
	 							var ps = pathsname.split("/");
	 							mpath = Path.normalize(proxy + "/" + ps.join("/"));
	 						}else{
	 							mpath = Path.normalize(self.config.path + pathname);
	 						}
	 						self.findFile(mpath, function(path) {
	 							if(!path) {
	 								self.proxyWeb(pathname, req, res);
	 								return;
	 							}
	 							var fileType = Path.extname(path);
	 							res.setHeader("Content-Type", Mines.getFileType(file) || "application/octet-stream");
	 							require("fs").stat(path, function(err, stat) {
	 								var lastModified = stat.mtime.toUTCString();
	 								if(req.headers["If-Modified-Since"] && lastModified == req.headers["If-Modified-Since"]) {
	 									response.statusCode = 304;
	 									response.end();
	 								}else{
	 									res.setHeader("Last-Modified", lastModified);
	 									if(self.config.cache) {
	 										var expires = new Date();
	 										var maxAge = self.config.cache || 0;
	 										expires.setTime(expires.getTime() + maxAge * 1000);
	 										res.setHeader("Expires", expires.toUTCString());
	 										res.setHeader("Cache-Control", "max-age=" + maxAge);
	 									}
	 									var stream = require("fs").createReadStream(path, {
	 										flag: "r",
	 										autoClose: true
	 									});
	 									var Zlib = require("zlib");
	 									if(self.config.gzip && stat.size > self.config.gzip) {
	 										var acceptEncoding = req.headers["accept-encoding"];
	 										if(acceptEncoding.match(/\bgzip\b/)) {
	 											res.setHeader("Content-Encoding", "gzip");
	 											stream.pipe(Zlib.createGzip().pipe(res));
	 										}else if(acceptEncoding.match(/\bdeflate\b/)) {
	 											res.setHeader("Content-Encoding", "deflate");
												stream.pipe(Zlib.createDeflate()).pipe(res);
	 										}else{
	 											stream.pipe(res);
	 										}

	 									}else{
 											stream.pipe(res);
 										}
	 								}
	 							});
	 						});
	 					}
	 					/**

	 						@method proxyWeb
	 						@param pathname
	 						@param req
	 						@param res
	 					*/
	 					this.proxyWeb = function(pathname, req, res) {
	 						var onError = function() {
	 							res.writeHead(404);
	 							res.end("not find");
	 						}
	 						var type = req.method.toLowerCase();
	 						if(this.config.proxyUrl) {
	 							/**
	 								没有用pathname
	 								因为中文问题
	 								不能对pathname 
	 								但是对应的png 以及woff加载失败 
	 								xhr encoding 问题  不能设置utf8
	 							*/
	 							latte_lib.xhr[type](
	 								this.config.proxyUrl + Url.parse(req.url).pathname,
	 								req[type+"s"], 
	 								{
	 									headers: req.headers
	 								},
	 								function(data, headers) {
	 									res.end();
	 								},
	 								function(error) {
	 									console.log(error);
	 									onError();
	 								}
	 							).on("chunk", function(data) {
	 								res.write(data, "utf8");
	 							}).on("headers", function(headers) {
	 								for(var i in headers) {
	 										/**
		 									if(i == "connection") {
		 										continue;
		 									}
		 									*/
	 									
	 									res.setHeader(i, headers[i]);
	 								}
	 							}).on("err", function(error) {
	 								console.log(error);
	 							});

	 						}else{
	 							
 								onError();
 								return;
	 							
	 						}
	 					}
	 					/**
	 						读取文件
	 						@method staticFile
	 						@param pathname {String}
	 						@param req
	 						@param res
	 					*/
	 					this.staticFile = function(pathname, req, res) {
	 						var self = this;
							var paths = pathname.split("/");
							var proxy	 = this.config.proxys[paths[1]];
							var mpath;
							if(proxy) {
								var ps = paths.splice(2);
								mpath = Path.normalize(proxy + "/" + ps.join("/"));
							} else{
								mpath = Path.normalize(self.config.path + pathname);
							}

							self.findFile(mpath, function(path) {
								if(!path) {
									self.proxyWeb(pathname, req, res);
									return
								}
								var fileType = Path.extname(path);
								res.setHeader("Content-Type", Mines.getFileType(fileType) || "application/octet-stream");
								require("fs").stat(path, function(err, stat) {
									var lastModified =  stat.mtime.toUTCString();
									if(req.headers["If-Modified-Since"] && lastModified == req.headers["If-Modified-Since"]) {
										response.statusCode = 304;
			    						response.end();
									}else{
										res.setHeader("Last-Modified", lastModified);
										if(self.config.cache) {
											var expires = new Date();
											var maxAge = self.config.cache || 0;
											expires.setTime(expires.getTime() + maxAge* 1000);
											res.setHeader("Expires", expires.toUTCString());
											res.setHeader("Cache-Control", "max-age=" + maxAge);
										}
										var stream = require("fs").createReadStream(path, {
											flag:"r",
											autoClose: true
										});
										var Zlib = require("zlib");
										if(self.config.gzip &&
											stat.size > self.config.gzip ) {
											var acceptEncoding = req.headers['accept-encoding']
											if(acceptEncoding.match(/\bgzip\b/)) {
												res.setHeader("Content-Encoding", "gzip");
												stream.pipe(Zlib.createGzip().pipe(res));
											}else if(acceptEncoding.match(/\bdeflate\b/)) {
												res.setHeader("Content-Encoding", "deflate");
												stream.pipe(Zlib.createDeflate()).pipe(res);
											}
										}else{
											stream.pipe(res);
										}
									}

								});


							});
	 					}
	 						this.onRequestSend = function(data, req, res) {
								var self = this;
								var fns = this.afters.map(function(fn) {
									return function(callback) {
										fn(req, res, callback);
									};
								});
								latte_lib.async.parallel(fns, function(err) {
										if(err) {
											throw err;
										}
										res.end(data.toString());
								});
							}

	 					/**
	 						@method request
	 						@param fn {Function}
	 						@param req
	 						@param res

	 					*/
	 					this.request = function(fn , req, res) {
	 						
	 						var self = this;
	 						res.on("close", function() {
	 							self.httpCount--;
	 							if(self.httpCount == 0) {
	 								self.emit("noChannel");
	 							}
	 						});
	 						res.send = function(data) {
	 							self.onRequestSend(data, req, res);	 							
	 						}
	 						//console.log(self);
	 						var fns = this.befores.map(function(f) {
 								return function(callback) {
 									f.call(self, req, res, callback);
 								}
 							});
 							latte_lib.async.parallel(fns, function(err) {
 								if(err) {
 									throw err;
 								}

 								fn.call(self, req, res);
 							});
	 					}
	 				/**
	 					@method onRequest
	 					@param req
	 					@param res
	 				*/
	 				this.onRequest = function(req, res) {
	 					var self = this;

	 					var url = Url.parse(req.url);
	 					var pathname = decodeURIComponent(url.pathname);
	 					
	 					if(self.ios && self.ios.all[pathname]) {
	 						req.gets = Querystring.parse(url.query);
	 						self.ios.all[pathname].handleRequest(req, res);
	 						return;
	 					}
	 					this.httpCount++;
	 					switch(req.method.toLowerCase()) {
	 						case "post":
	 							if(self.posts[pathname]) {
	 								this.getPostData(req, function(err, data) {
	 									if(err) { throw err; }
	 									req.posts = data;
	 									req.gets = Querystring.parse(url.query);
	 									self.request(self.posts[pathname], req, res);
	 								});
	 							}else{
	 								for(var i = 0, len = this.postRegs.length; i < len; i++) {
	 									var regs = this.postRegs[i];
	 									var matched = regs.regexp.exec(pathname);
	 									if(matched) {
	 										return this.getPostData(req, function(err, data) {
	 											req.posts = data;
	 											req.gets = Querystring.parse(url.query);
	 											for(var i = 0, l = keys.length; i < l ; i++) {
	 												var value = matched[i+1];
	 												if(value) {
	 													req.gets[keys[i]] = value;
	 												}
	 											}
	 											self.request(reqs.action, req, res);
	 										});
	 									}
	 								}
	 								this.proxyWeb(pathname, req, res);
	 							}
	 						break;
	 						case "get":

	 							if(self.gets[pathname]) {
	 								req.gets = Querystring.parse(url.query);
	 								req.posts = {};
	 								return self.request(self.gets[pathname],  req, res);
	 							}else{
	 								for(var i = 0, len = this.postRegs.length; i < len; i++) {
	 									var regs = this.getRegs[i];
	 									var matched = regs.regexp.exec(pathname);
	 									if(matched) {
	 										req.posts = {};
	 										req.gets = Querystring.parse(url.query);
	 										var keys = regs.keys;
	 										for(var i = 0, l = keys.length; i < l ; i++) {
	 											var value = matched[i+1];
	 											if(value) {
	 												req.gets[keys[i]] = value;
	 											}
	 										}	 							
	 										return self.request(reqs.action, req, res);		
	 									}
	 								}
	 								self.staticFile(pathname, req, res);
	 							}
	 						break;
	 					
	 					}

	 				}


	 				this._stop = function(callback) {
	 					
	 					this.server.once("close" , function() {
	 						console.log("server slave stop", Cluster.worker.id);
	 						
	 						process.exit(0);
	 					});
	 					this.server.close();
	 					callback(null, Cluster.worker.id);

	 				}
	 			this._run = function() {
	 				if(this.config.webPath) {
	 					var self = this;
	 					this.config.webPath.forEach(function(path) {
	 						self.loadWeb(path);
	 					});
	 					
	 				}
	 			
	 				//启动web服务器
	 				var self = this
	 					, serverDomain = Domain.create();
	 				serverDomain.on("error", function(err) {
	 					if(self.config.log) {
	 						var filename = "./logs/otherError/"+latte_lib.format.dateFormat()+".log";
							latte_lib.fs.writeFile(filename, getErrorString(err));
	 					}else{
	 						throw err;
	 					}
	 				});
	 				serverDomain.run(function() {
	 					var Http = require(self.config.type);
	 					var server = self.server = Http.createServer(function(req, res) {
	 						var reqd = Domain.create();
	 						reqd.on("error", function(err) {
	 							res.setHeader("Content-Type", "text/plan");
	 							res.end(getErrorString(err));
	 							if(self.config.log) {
	 								var filename = "./logs/webError/" + latte_lib.format.dateFormat() + ".log";
									latte_lib.fs.writeFile(filename, [
											req.url ,
											"gets:" + latte_lib.format.jsonFormat(req.gets),
										  "posts:" + latte_lib.format.jsonFormat(req.posts),
										 	getErrorString(err)
										].join("\n")
									);
	 							}else {
									throw err;
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

	 			this.change = function() {
	 				
	 			}
	 			var latte_watch = require("latte_watch");
	 			this.watchWebAndRpc = function() {
	 				if(this.config.webPath.length > 0 ) {
	 					var we = {};
	 					var self = this;
	 					/**
	 						更新web   机制
	 						当文件发生改变(文件修改, 文件删除)是关闭所有web进程  然后使之重启
	 						当文件添加的时候  则是发送消息给子进程
	 					*/
	 					this.config.webPath.forEach(function(path) {
	 						var events = latte_watch.create(path);
	 						we[path] = events;
		 					
		 					events.on("change", function(filename) {
		 						console.log("change File:" + filename);
		 						//添加重启事件
								self.webRestart(); 						
		 					});
		 					events.on("add", function(filename) {
		 						console.log("add File " + filename);
		 						self.rpc.CallAll("addWebFile", [filename]);
		 						//self.rpc.CallAll("")
		 					});
		 					events.on("unlink" , function() {
								self.webRestart();
							});
							events.on("unlinkDir", function(){
								self.webRestart();
							});
	 					});
	 					
	 				}
	 				if(this.config.rpc.rpcPath && this.config.rpc.rpcPath.length > 0 ) {
	 					/**
	 						更新rpc  机制(隐患未确定) 
	 						
	 						先更新web 之后更新rpcWork

	 					*/
	 					this.config.rpc.rpcPath.forEach(function(path) {
	 						var events = latte_watch.create(path);
		 					events.on("change", function() {
		 						self.webRestart();
		 						self.rpc.restart();
		 					});
	 					});
	 					
	 				}
	 				
	 			}
	 				this.addRpcClient = function(worker) {
	 					
	 					this.workers.push(worker);
	 					this.rpc.addWorker(worker);
	 				}
	 				this.webRestart = function() {
	 					this.config.restart = 1;
 						this.rpc.CallAll("stop",[], function() {

 						});
						
	 				}

	 			this.createWebWorker = function() {
	 				var worker = Cluster.fork();
	 				this.emit("start", worker);
	 				this.addRpcClient(worker);
	 				return worker;
	 			}
	 			this.createRpcWorker = function() {
	 				
	 			}
 
 
	 			this.run = function() {
					 if(this.server) { return; }
					 if(Cluster.isMaster) {
					 	var self = this;

					 	for(var i = 0, len = this.config.cpus; i < len ; i++) {
						 	var worker = self.createWebWorker();
					 	}
					 	/**
					 		子进程关闭  之后进行重启
					 	*/
						Cluster.on("exit", function(worker) {
							//console.log("????????????");
						 	self.rpc.removeWorker(worker);
						 	if(self.config.restart) {
							 	var now = self.createWebWorker();
							 	console.log("restart");
								self.emit("restart", worker,now);
						 	}
						});
						self.watchWebAndRpc();
						self.createRpcWorker();

					 }else{
						 this._run();
					 }
				}
	 		}).call(Server.prototype);
		module.exports = Server;
 	});
})(typeof define === "function"? define: function(name, reqs, factory) {factory(require, exports, module); });
