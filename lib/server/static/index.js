var  latte_lib = require("latte_lib")
	, Path = require("path")
	, Mines = require("./mines")
	, defaultConfig = {
	paths: {

	},
	indexs: ["index.html"],
	cache: 0
};
var Static = function(config) {
	this.config = latte_lib.merger(defaultConfig, config);
	this.filters = {};
};
(function() {
	this.addFilter= function(name, func) {
		this.filters[name] = func;
	}
	/**
		怎么匹配更好
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
						}else{
							cb();
						}
						
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
				}else{
					callback();
				}
				
			});
		}
	}
	this.request = function(pathname, req , res, next) {
		var path;

		for(var i in this.config.paths) {
			if(pathname.indexOf(i) == 0 && ( !path || path.length< i.length)) {
				path = i;
			}	
		}
		var self = this;
		if(path) {
			
			var filePath = pathname.replace(path, this.config.paths[path]); 
			res.handleType = "staticWeb";
			this.findFile(filePath, function(newPath) {
				if(!newPath) {
					return next();
				}
				var filter = self.filters[Path.extname(newPath).substring(1)];
				if(filter) {
					return res.end(filter(newPath));
				}
				console.log(filter)
					var stream = require("../../view/types/file.js").render(newPath, req, res, this.config);
					
					if(stream && stream.pipe) {
						return stream.pipe(res);
					}else {
						//res.write(stream, "utf8");
						res.end(stream.toString("utf8"));
					}
					
				
				
			});
			
		}else{
			next();
		}
		
		
	}
	/**
	this.request = function(pathname, req, res) {
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
	*/
}).call(Static.prototype); 
module.exports = Static;