(function(){
	var latte_lib = require("latte_lib")
		, Path = require("path")
		, Mines = require("../../server/static/mines.js");
	this.render = function(newPath, req, res, config) {

		if(!res) {
			return latte_lib.fs.readFileSync(newPath);
		}

		require("../../utils.js").Origin(req, res);
		var fileType = Path.extname(newPath);
		//console.log(Mines.getFileType(fileType));
		res.setHeader("Content-Type", Mines.getFileType(fileType) || "application/octet-stream");
		//require("fs").stat(filePath, function(err, stat) {
			var stat;
			try{
				stat = latte_lib.fs.statSync(newPath);
			}catch(e) {
				return e.stack.toString();
			}


			var lastModified = stat.mtime.toUTCString();
			if(req && req.headers["If-Modified-Since"] && lastModified == req.headers["If-Modified-Since"]) {
				res.statusCode = 304;
				return null;
			}else{

				res.setHeader("Last-Modified", lastModified);
				if(config && config.cache) {
					
					var expires = new Date();
					var maxAge = config.cache || 0;
					expires.setTime(expires.getTime() + maxAge * 1000);
					res.setHeader("Expires", expires.toUTCString());
					res.setHeader("Cache-Control", "max-age=" + maxAge);

				}
				var stream = require("fs").createReadStream(newPath, {
					flag: "r",
					autoClose: true
				});
				var Zlib = require("zlib");

				if(config && config.gzip && stat.size > config.gzip) {

					var acceptEncoding = req.headers["accept-encoding"];
					if(acceptEncoding.match(/\bgzip\b/)) {
						res.setHeader("Content-Encoding", "gzip");
						//stream.pipe(Zlib.createGzip().pipe(res));
						return stream.pipe(Zlib.createGzip());
					}else if(acceptEncoding.match(/\bdeflate\b/)) {
						res.setHeader("Content-Encoding", "deflate");
						//stream.pipe(Zlib.createDeflate()).pipe(res);
						return stream.pipe(Zlib.createDeflate());
					}else{
						//stream.pipe(res);
						return stream;
					}

				}else{
					//stream.pipe(res);
					return stream;
				}
			}
		//});
	}
}).call(module.exports);