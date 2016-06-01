(function() {
	//console.log("???");
	this.get = function(req, res) {
		res.send("hello");
	}
	this.path = "/hello";
}).call(module.exports);	