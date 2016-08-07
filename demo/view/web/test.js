(function() {
	this.get = function(req, res) {
		res.sendView("jade", "./test.jade", {youAreUsingJade : 1});
	}
	this.path = "/hello";
}).call(module.exports);	