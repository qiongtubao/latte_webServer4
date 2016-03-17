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
	 			this._run = function() {

	 			}

	 			this.change = function() {
	 				
	 			}
	 			this.watchWeb = function() {
	 				if(this.config.watchWeb) {
	 					var events = latte_watch.create(this.config.watchWeb);
	 					events.on("change", function() {
							this.change(); 						
	 					});
	 				}
	 				
	 			}
	 			this.run = function() {
					 if(this.server) { return; }
					 if(Cluster.isMaster) {
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
						this.Watch();

					 }else{
						 this._run();
					 }
				}
	 		}).call(Server.prototype);
		
 	});
})(typeof define === "function"? define: function(name, reqs, factory) {factory(require, exports, module); });
