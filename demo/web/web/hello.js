(function() {
	this.get = function(req, res) {
		res.send("it's latte work");
	}
	this.path = "/";
}).call(module.exports);	