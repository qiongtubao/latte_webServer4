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
			, Modules= require("latte_require")
			, Post = require("../post")
			, Fs = latte_lib.fs
			, Ios = require("../io")
			, latte_watch = require("latte_watch");
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
	 			this.gets = {};
	 			this.posts = {};
	 			this.getRegs = [];
	 			this.postRegs = [];
	 			this.befores = [];
	 			this.afters = [];
	 			this.rpc = new Rpc(this.config.rpc);
				var self = this;
	 			this.cache = {};

				if(this.config.web) {
					this.reloadWeb();
				}
				this.httpCount = 0;
	 		};
	 		(function() {
	 				this.onUpgrade = function(req, socket, head) {
						var url = Url.parse(req.url);
						var pathname = url.pathname;
						var self = this;
						if(self.ios.all[pathname]) {
							req.gets = Querystring.parse(url.query);
							self.ios.all[pathname].handleUpgrade(req, socket, head);
						}
					}
	 			this._run = function() {
	 				//web 服务器
	 				var self = this
	 					, serverDomain = Domain.create();
	 				serverDomain.on("error", function(err) {
	 					if(self.config.log) {
	 						var filename = "./logs/otherError/"+latte_lib.format.dateFormat() + ".log";
	 						latte_lib.fs.writFile(filename,getErrorString(err));
	 					}else {
	 						throw err;
	 					}
	 				});
	 				serverDomain.run(function() {
	 						var Http = require(self.config.type);
 						var server = self.server = Http.createServer(function(req, res) {
	 						var reqd = Domain.create();
	 						reqd.on("error", function(err) {
	 							res.setheader("Content-Type", "text/plan");
	 							res.end(getErrorString(err));
	 							if(self.config.log) {
	 								var filename = "./logs/webError/" +latte_lib.format.dateFormat() + ".log";
	 								latte_lib.fs.writFile(filename, [req.url, 
	 									"gets:" + latte_lib.format.jsonFormat(req.gets),
	 									"posts:" + latte_lib.format.jsonFormat(req.posts),
	 									getErrorString(err)]).join("\n");
	 								
	 							}else{
	 								throw err;
	 							}
	 						});
	 						reqd.run(function() {
	 							self.onRequest(req, res);
	 						});

	 					});
	 					server.timeout = self.config.timeout;
	 					server.on("upgrade", function() {
	 						self.onUpgrade(req, socket, head);
	 					});
	 					server.listen(self.config.port, function() {
	 						latte_lib.debug.info(self.cofig.port, "start");
	 					});
 					});
	 				
	 			}

	 				this.createRpc = function() {
	 					this.rpc = require("./rpc/master.js");

	 				}

		 			this.createWeb = function() {
		 				var self = this;
					 	for(var i = 0, len = this.config.cpus; i < len ; i++) {
						 	var worker = self.createWorker();
					 	}
						Cluster.on("exit", function(worker) {
						 	self.rpc.removeWorker(worker);
						 	if(self.config.restart) {
							 	var now = self.createWorker();
								self.emit("restart", worker,now);
						 	}
						});
		 			}

		 			this.createMasterRpc = function() {
		 				this.rpc = require("./rpc/slave.js");
		 			}
		 			this.createSlaveRpc = function() {
		 				this.rpc = require("./rpc/master.js");
		 			}
	 			this.run = function() {
					 if(this.server) { return; }
					 if(Cluster.isMaster) {
					 	//创建web 服务器 
						this.createWeb();
						//创建rpc 对象
						this.createMasterRpc();

					 }else{
						 this._run();
						 this.createSlaveRpc();
					 }
				}
	 		}).call(Server.prototype);
		
 	});
})(typeof define === "function"? define: function(name, reqs, factory) {factory(require, exports, module); });
