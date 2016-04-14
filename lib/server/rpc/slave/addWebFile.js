(function() {
	var latte_lib = require("latte_lib");
	/**
		添加文件则不需要用全部更新

	*/
	this.slave = function(path) {
		this.server.loadWeb(path);
	}
	this.method = "addWebFile";
}).call(module.exports);