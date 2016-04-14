(function() {
	this.master = function(callback) {
	
		this.CallAll("stop", [], function() {
			console.log("master stop");
		});
	}
	this.slave = function(callback) {
		this.server._stop(callback);
		//this._stop(callback);
	}
	this.method = "stop";
}).call(module.exports);