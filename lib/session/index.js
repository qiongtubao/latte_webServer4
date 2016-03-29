(function(define) { 'use strict';
	define("latte_web/session/index", ["require", "exports", "module", "window"],
	function(require, exports, module, window) {
		var Store = require("./memoryStore");
		var crypto = require("crypto");
		var UIDCHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		function tostr(bytes) {
			var chars, r;
			r = [];
			for(var i = 0; i < bytes.length; i++) {
				r.push(UIDCHARS[bytes[i] % UIDCHARS.length]);
			}
			return r.join("");
		}
		function uid(length, cb) {
			if(typeof cb === "undefined") {
				return tostr(crypto.pseudoRandomBytes(length));
			} else {
				crypto.pseudoRandomBytes(length, function(err, bytes) {
					if(err) return cb(err);
					cb(null, tostr(bytes));
				});
			}
		}
		function Session(opts) {
			this.key = opts.key || "latte.sid";
			this.store = opts.store || new Store({timeout: opts.timeout});
			this.useAjaxKey = opts.useAjaxKey;
			this.timeout = opts.timeout ;
		};
		(function() {
			this.before = function(req, res, next) {
				var self = this;
				if(!req.cookies) {
					throw new Error("you not set cookies");
				}
				var key = req.cookies.get(this.key);
				if(!key && this.useAjaxKey) {
					key = req.gets[this.useAjaxKey] || req.posts[this.useAjaxKey];
				}
				req.sessionStore = this.store;
				function reset(oldKey) {
					req.sessionId = key = oldKey || uid(24);
					req.cookies.add({name: self.key, value:key});
					req.session = {
						id: key,
						expire: Date.now() + self.timeout
					};
					req.session.setData = function(data) {
						req.session.data  = data;
						req.session._change = 1;
					}
					next();
				}
				req.sessionId = key;
				if(!key) {
					reset();
				} else {
					this.store.get(key, function(err, data) {
						if(err) { throw err; }
						if(!data) { return reset(key); }
						req.session = data;
						req.session.setData = function(data) {
							req.session.data  = data;
							req.session._change = 1;
						}
						next();
					});
				}

			}
			this.after = function(req, res, next) {
				var key = req.sessionId;
				if(req.session._change) {
					delete(req.session._change);
					delete(req.session.setData);
					this.store.set(key, req.session, function(err, data) {
						if(err) { throw err;}
						next();
					});
				}else{
					next();
				}
			}
		}).call(Session.prototype);
		module.exports = function(opts) {
			return new Session(opts);
		};
		(function() {
			var redisStore = require("./redisStore");
			this.createRedisStore = function(opts) {
				return new redisStore(opts);
			}
			var mongodbStore = require("./mongodbStore");
			this.createMongodbStore = function(opts) {
				return new mongodbStore(opts);
			}
		}).call(module.exports);
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
