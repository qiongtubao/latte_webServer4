(function() {
	this.get = function(req, res) {
		process.latte.stop();
	}
	this.path = "stop";
}).call(module.exports);