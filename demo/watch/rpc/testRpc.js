(function() {
	this.master = function(a, b, callback) {
		callback(null, a * b);
	}
	this.method = "testRpc";
}).call(module.exports);