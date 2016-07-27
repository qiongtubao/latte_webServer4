	/**	
		单个监控
	*/
	var latte_lib = require("latte_lib")
		,Load = require("../load.js") 
		,Querystring = require("querystring")
		, Url = require("url")
		, Post = require("../../post")
		,defaultConfig = {

		};
	var Web = function(config , server) {
		
		this.config = latte_lib.merger(defaultConfig, config);

		this.befores = [];
		this.afters = [];
		this.gets = {};
		this.posts = {};
		this.getRegs = [];
		this.postRegs = [];
		this.server = server;
		Load.call(this, this.config);

		//this.start();
	};
	latte_lib.inherits(Web, Load);
	(function() {
			this.clean = function() {
				this.gets = {};
				this.posts = {};
				this.getRegs = [];
				this.postRegs = [];
			}
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
		var  _self = this;
		["get", "post"].forEach(function(type) {
			_self[type] = function(path) {
				var args = Array.prototype.slice.call(arguments);
				args.unshift(type);
				_self.set.apply(this, args);
			}
		});
				/**
					http://127.0.0.1/:a/:b
				*/
					var pathReg = function(path) {
						var keys = [];
						path = path.concat("/?")
							.replace(/\/\(/g,"(?:/")
							.replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, function(_, slash, format, key, capture, optional, star) {
								slash = slash || "";
								keys.push(key);
								return ""
									+ (optional? "": slash)
									+ "(?:"
									+ (optional? slash: "")
									+ (format || "") + (capture || (format && "([^/.]+?)" || "([^/]+?)")) + ")"
									+ (optional || "")
									+ (star? "(/*)?": "");
							})
							.replace(/([\/.])/g, "\\$1")
							.replace(/\*/g, "(.*)");
							
						return {
							keys : keys,
							regexp: new RegExp("^" + path + "$")
						};
					}
				this.setReg = function(type, path) {
					var self = this;
					var handles = Array.prototype.slice.call(arguments, 2);
					handles.forEach(function(fn) {
						if(!latte_lib.isFunction(fn)) {
							throw new Error("setReg" + path + "," + type + "handle has not function!!");
						}
					});
					if(this[type+ "s"]) {								
						var object = pathReg(path);
						object.action = function(req, res) {
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
						};
						this[type+"s"].push(object);
					}
				};
		["getReg", "portReg"].forEach(function(type) {
			_self[type] = function(path) {
				var args = Array.prototype.slice.call(arguments);
				args.unshift(type);
				_self.setReg.apply(this, args);
			}
		});
		this.load = function(o) {
			
			var self = this;
			if(o.get && o.path) {
				var args = [o.path];
				if(latte_lib.isArray(o.get)) {
					args = args.concat(o.get);
				}else{
					args.push(o.get);
				}
				self.get.apply(this, args);
			}
			if(o.post && o.path) {
				var args = [o.path];
				if(latte_lib.isArray(o.post)) {
					args = args.concat(o.post);
				}else{
					args.push(o.post);
				}
				self.post.apply(this, args);
			}
			if(o.getReg && o.path) {
				var args = [o.path];
				if(latte_lib.isArray(o.getReg)) {
					args = args.concat(o.getReg);
				}else{
					args.push(o.getReg);
				}
				self.getReg.apply(this, args);
			}
			if(o.postReg && o.path) {
				var args = [o.path];
				if(latte_lib.isArray(o.postReg)) {
					args = args.concat(o.postReg);
				}else{
					args.push(o.postReg);
				}
				self.postReg.apply(this, args);
			}
		}
			this.getPostData = function(req, callback) {
				var self = this
					, post = new Post({
						uploadDir: self.config.uploadDir
					})
					, posts = {
						_files: []
					};
					var called;
				var onceCallback = function(err, data) {
					if(called) {
						callback(err);
						return;
					}
					called = 1;
					callback(err, data);
				}
				post
				.on("error", function(err) {
					callback(err);
				})
				.on("field", function(field, value) {
					posts[field] = value;
				})
				.on("file", function(filename, file) {
					posts._files.push(file);
				})
				.on("text", function(data) {
					posts._text = data;
				})
				.on("end", function() {
					onceCallback(null, posts);
				});
				post.parse(req);
			}
			this.send = function(data, req, res) {
				var self = this;
				var fns = this.afters.map(function(fn) {
					return function(callback) {
						fn.call(self.server, req, res, callback);
					};
				});
				latte_lib.async.parallel(fns, function(err) {
						if(err) {
							throw err;
						}
						
						res.end(data.toString());
				});
			}
			this.run = function(fn, req, res) {
				var self = this;
				res.send = function(data) {
					self.send(data, req, res);
				}
				var fns = this.befores.map(function(f) {
					return function(callback) {
						f.call(self.server, req, res, callback);
					}
				});
				latte_lib.async.parallel(fns, function(err) {
					if(err) {
						throw err;
					}

					fn.call(self.server, req, res);
				});
			}
		this.request = function(pathname, req, res, next) {
			var self = this;
			var url = Url.parse(req.url);
			switch(req.method.toLowerCase()) {
				case "post":
					if(self.posts[pathname]) {
						res.handleType = "web";
						self.getPostData(req, function(err, data) {
							if(err) {
								return self.emit("error", err, req, res);
							}
							req.posts = data;
							req.gets = Querystring.parse(url.query);
							self.run(self.posts[pathname], req, res);
						});
						return 1;
					}else{
						for(var i = 0, len =  this.postRegs.length; i < len; i++) {
							var regs = this.postRegs[i];
							var matched = regs.regexp.exec(pathname);
							if(matched) {
								res.handleType = "web";
								self.getPostData(req, function(err, data) {
									if(err) {
										return self.emit("error", err, req, res);
									}
									req.posts = data;
									req.gets = Querystring.parse(url.query);
									for(var i = 0, l = keys.length; i < l; i++) {
										var value = matched[i + 1];
										if(value) {
											req.gets[keys[i]] = value;
										}
									}
									self.run(reqs.action, req, res);
								});
								return 1;
							}
						}

					}
					
				break;
				case "get":
					if(self.gets[pathname]) {
						res.handleType = "web";
						req.gets = Querystring.parse(url.query);
						req.posts = {};
						self.run(self.gets[pathname],  req, res);
						return 1;
					}else{
						for(var i = 0, len = this.getRegs.length; i < len; i++) {
							var regs = this.getRegs[i];
							var matched = regs.regexp.exec(pathname);
							if(matched) {
								res.handleType = "web";
								req.posts = {};
								req.gets = Querystring.parse(url.query);
								var keys = regs.keys;
								for(var i = 0, l = keys.length; i < l; i++) {
									var value = matched[i+1];
									if(value) {
										req.gets[keys[i]] = value;
									}
								}
								self.run(regs.action, req, res);
								return 1;
							}
						}
					}
				break;
				
			}
			next();
		}
		/**
			@method before
			@param {Function} fn
				var Server = require("latte_web");
				var server = new Server({});
				server.before(function(req, res, next) {

				});
		*/
		this.before = function(fn) {
			if(latte_lib.isFunction(fn)) {
				this.befores.push(fn);
			}
		}


		/**
			@method after
			@param {Function} fn
			@example
			var Server = require("latte_web");
			var server = new Server({});
			server.after(function(req, res, next) {

			});
		*/
		this.after = function(fn) {
			if(latte_lib.isFunction(fn)) {
				this.afters.push(fn);
			}
		}
		this.use = function(opts) {
			this.before(opts.before.bind(opts));
			this.after(opts.after.bind(opts));
		}
	}).call(Web.prototype);
	module.exports = Web;
