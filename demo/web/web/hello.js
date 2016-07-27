(function() {
	this.get = function(req, res) {
		res.send("go ! to");
	}
	this.path = "/hello";
}).call(module.exports);	