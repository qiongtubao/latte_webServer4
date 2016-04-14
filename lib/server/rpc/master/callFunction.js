(function() {
	/**
		内置运行代码
		暂时没开放设置内置函数的功能
	*/
	this.master = function(data,socket, cb) {
		var fun = eval(data.code);
		//fun.call(this, data, cb);
	}
	this.method = "__callFunction";
}).call(module.exports);