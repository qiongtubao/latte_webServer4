(function(define) { 'use strict';
	define("latte_web/session/redisStore", ["require", "exports", "module", "window"],
	function(require, exports, module, window) {
		var Redis = require("latte_db").redis;

		function RedisStore(opts) {
			this.pool = opts.pool || Redis.create(opts);
			this.timeout = opts.timeout/1000 || 60 * 60;
		};
		(function() {
			this.get = function(sid, fn) {
				this.pool.command(function(err, client, callback) {
					if(err) { callback(err); return fn(err); }
					client.get(sid, function(err, data) {
						callback(err);
						if(err) {return fn(err); }
						if(data) {
							data = JSON.parse(data);
						}
						fn(null, data);
					});
				});
			}
			this.set = function(sid, session, fn) {
				var sess = JSON.stringify(session);
				var ttl = this.timeout;
				this.pool.command(function(err, client,callback) {
					if(err) {
						callback(err);
						return fn(err);
					}
					client.setex(sid, ttl, sess, function(err) {
						callback(err);
						fn && fn.apply(this, arguments);
					});
				});
			}
			this.del = function(sid, fn) {
				this.pool.command(function(err, client, callback) {
					if(err) {callback(err); return fn(err);}
					client.del(sid, function(err) {
						callback(err);
						fn && fn.apply(this, arguments);
					});
				});
			}
		}).call(RedisStore.prototype);
		module.exports = RedisStore;
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
