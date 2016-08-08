(function() {
	this.get = function(req, res) {
		res.sendView("latte", "./view/index.latte", { 
			code : 200
		});
	}
	this.path = "/latte";
}).call(module.exports);	