var latte_lib = require("latte_lib");
var defaultConfig = {
	paths: {

	}
};
var Proxy =function(config) {
	this.config = latte_lib.merger(defaultConfig, config);
};
(function() {

	this.request = function(pathname, req, res, next) {
		var type = req.method.toLowerCase();	
		var path ;
		for(var i in this.config.paths) {
			if(pathname.indexOf(i) == 0 && ( !path || path.length< i.length)) {
				path = i;
			}	
		}
		console.log(path, pathname);
		if(path) {
			var newPathname = pathname.substring(path.length);
			latte_lib.xhr[type](
				(this.config.paths[path].indexOf("http") != -1 ? this.config.paths[path] : "http://"+this.config.paths[path]) + newPathname,
				req[type+"s"],
				{
					headers: req.headers
				},
				function(data, headers) {
					res.end();
				}
			).on("chunk", function(data) {
				res.write(data, "utf8");
			}).on("headers", function(headers) {
				for(var i in headers) {
					res.setHeader(i, headers[i]);
				}
			}).on("err", function(error) {
				console.log(error);
			});
			/**
			latte_lib.xhr[type](
				this.config.proxyUrl + pathname,
				req[type+"s"], 
				{
					headers: req.headers
				},
				function(data, headers) {
					res.end();
				},
				function(error) {
					console.log(error);
					next();
				}
			).on("chunk", function(data) {
				res.write(data, "utf8");
			}).on("headers", function(headers) {
				for(var i in headers) {
					
					res.setHeader(i, headers[i]);
				}
			}).on("err", function(error) {
				console.log(error);
			});
			*/
		}else{
			next();
			return;
		}
	}
}).call(Proxy.prototype);
module.exports = Proxy;