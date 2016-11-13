(function() {
	this.get = function(req, res) {
		res.send("hello,world");
	}
	this.path = "/";
}).call(module.exports);	