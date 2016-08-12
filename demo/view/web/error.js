(function() {
	this.get = function(req, res) {
		var a;
		console.log(a.sorry);
		res.sendView("error", new Error("sorry"));
	}
	this.path = "/error";
}).call(module.exports);	