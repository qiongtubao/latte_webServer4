
	var latte_lib = require("latte_lib");
	var defaultConfig = {
		
	};
	var Status = function(config) {
		this.config = latte_lib.merger(defaultConfig, config);
	};
	(function() {
		this[404] = function(pathname, req, res) {
			res.writeHead(404);
			res.end("not find "+pathname);
		}
	}).call(Status.prototype);
	module.exports = Status;
