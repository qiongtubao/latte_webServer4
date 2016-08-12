(function(define) { 'use strict';
	define("latte_web/cookie/index", ["require", "exports", "module", "window"],
	function(require, exports, module, window) {
			var utils = require("../utils")
				,latte_lib = require("latte_lib")
				, encode = encodeURIComponent
				, decode = decodeURIComponent;
			var parseCookie = function(cookie) {
				var cookies = {};
				if(!cookie) {
					return cookies;
				}
				var list = cookie.split(";");
				for(var i = 0, len = list.length; i < len; i++) {
					var pair = list[i].split("=");
					cookies[pair[0].trim()] = pair[1];
				}
				return cookies;
			}
			var stringifyCookie = function(opts) {
				if(!opts.name || !opts.value) return null;
				var pairs =[opts.name + "=" + encode(opts.value)];
				opts = opts || {};
				if(opts.maxAge) pairs.push("Max-Age=" + opts.maxAge);
				if(opts.domain) pairs.push("Domain=" + opts.domain);
				if(opts.path) pairs.push("Path=" + opts.path);
				if(opts.expires) pairs.push("Expires=" + opts.expires.toUTCString());
				if(opts.httpOnly) pairs.push("HttpOnly");
				if(opts.secure) pairs.push("Secure");
				return pairs.join("; ");
			}
		function Cookies(cookie) {
			this.cookies = parseCookie(cookie);
			this.setCookies = {};
		};
		(function() {
			this.get = function(key) {
				return this.cookies[key];
			}
			this.add = function(opts) {
				this.setCookies[opts.name] = opts;
			}
			this.getSetCookie = function() {
				var keys = Object.keys(this.setCookies);
				var self = this;
				return keys.map(function(value) {
					
					return stringifyCookie(self.setCookies[value])
				});
			}
			this.remove = function(key) {
				if(this.cookies[key] != null) {
					return this.setCookies[key] = {
						name: key,
						value: this.cookies[key],
						maxAge : -1
					};
				}
				if(this.setCookies[key] != null) {
					delete this.setCookies[key];
				}
			}
		}).call(Cookies.prototype);
		(function() {
			var utils = require("../utils");
			this.before = function(req, res, next) {
				if(req.cookies) {
					return next();
				}
				var cookie = req.headers.cookie;
				req.cookies = new Cookies(cookie);
				next();
			}
			this.after = function(req, res, next) {
				var cookies = req.cookies;
				console.log(cookies.getSetCookie());
				utils.set( res, "Set-Cookie", cookies.getSetCookie())
				next();
			}
		}).call(module.exports);
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
