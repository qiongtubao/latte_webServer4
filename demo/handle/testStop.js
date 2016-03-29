(function() {
	this.get = function(req, res) {
		process.latte.on("stop", function() {
			res.send("stop");
		});
	}
	this.path = "testStop";
}).call(module.exports);