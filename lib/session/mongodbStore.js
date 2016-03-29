(function(define) { 'use strict';
	define("latte_web/session/mongodbStore", ["require", "exports", "module", "window"],
	function(require, exports, module, window) {
		var Mongodb = require("latte_db").mongodb;

		function MongodbStore(opts) {
			this.pool = opts.pool || Mongodb.create(opts);
			this.dbName = opts.dbName || "session";
			this.timeout = opts.timeout/1000 || 60 * 60;
			var self = this;
			this.pool.command(function(err, client, callback) {
				if(err) { callback(err); throw err; }
				client[self.dbName].dropIndex({"date":1}, function(err) {
					if(err) { console.log("clean mongodb ttl index  error"); }
					client[self.dbName].ensureIndex({ "date": 1 }, { expireAfterSeconds: self.timeout  }, function(err, data) {
						if(err) { console.log("set ttl index error");}
					})
				});

			})
		};
		(function() {
			this.get = function(sid, fn) {
				var self = this;
				this.pool.command(function(err, client, callback) {
					if(err) { callback(err); return fn(err); }
					client[self.dbName].findOne({_id: client.toObjectID(sid)} , function(err, data) {
						callback(err);
						fn && fn(err, data? data.session: data);
					});
				});
			}
			this.set = function(sid, session, fn) {
				var self = this;
				this.pool.command(function(err, client, callback) {
					if(err) { callback(err); return fn(err); }
					client[self.dbName].save({_id: client.toObjectID(sid) ,session: session, date: new Date()}, function(err) {
						callback(err);
						fn && fn.apply(this, arguments);
					});
				});
			}
			this.del = function(sid, fn) {
				var self = this;
				this.pool.command(function(err, client, callback) {
					if(err) { callback(err); return fn(err); }
					client[self.dbName].remove({_id: client.toObjectID(sid) }, function(err) {
						callback(err);
						fn && fn(err);
					});
				});
			}
		}).call(MongodbStore.prototype);
		module.exports = MongodbStore;
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
