(function() {
	this.get = function(req, res) {
		res.sendView("json", {
			code: 200
		});
	}
	this.path = "/json";
}).call(module.exports);	