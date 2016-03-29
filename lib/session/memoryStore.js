(function(define) { 'use strict';
	define("latte_web/session/memoryStore", ["require", "exports", "module", "window"],
	function(require, exports, module, window) {
		var latte_lib = require("latte_lib")
			, RemoveIdle = latte_lib.removeIdle;
		function MemoryStore(opts) {
			this.sessions = {};
			var self = this;
			RemoveIdle.call(this, {
				destroy: function(object) {
					for(var i in self.sessions) {
						if(self.sessions[i] == object) {
							self._del(i);
						}
					}
				},
				idleTimeoutMillis: opts.timeout || 60 * 1000 * 10
			})
			//this.runClean();
		};
		latte_lib.inherits(MemoryStore, RemoveIdle);
		/**
			还没加入清理功能
		*/
		(function() {
			this.get = function(key, cb) {
				var value = this.sessions[key];
				if(value) {
					this.getIdle(value);
				}
				cb && cb(null, value);
			}
			this.set = function(key, data, cb) {
				this.sessions[key] = data;
				this.release(data);
				cb && cb(null, 1);
			}
			this.del = function(key, cb) {
				var value = this.sessions[key];
				this.getIdle(value);
				this._del(key, cb);
 			}
 			this._del = function(key, cb) {
 				delete this.sessions[key];
 				cb && cb();
 			}
		}).call(MemoryStore.prototype);
		module.exports = MemoryStore;
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
