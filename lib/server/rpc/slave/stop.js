(function() {
	var latte_lib = require("latte_lib");
	/**
		debug 重现
		当更新的第一次的时候
		太快的话  可能会change 没反应

		而且有时候重启会卡断
		只有一个没有正常关闭  导致所有进程都只访问该进程  （原因不详）

	
		是否提高结束进程 (当连接数为0的时候就process.exit(0));
	*/
	this.slave = function(callback) {
		this.server._stop(callback);
	}
	this.method = "stop";
}).call(module.exports);