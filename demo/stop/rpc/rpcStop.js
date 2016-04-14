(function() {
	this.master = function(callback) {
		console.log(this);
		//this.Call("stop", [], function() {
			this.rpc.restart();
			callback();
		//});
	}
	this.slave = function(callback) {
		this.server._stop(callback);
		//this._stop(callback);
	}
	this.method = "rpcStop";
}).call(module.exports);