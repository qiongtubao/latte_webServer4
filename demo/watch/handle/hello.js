


(function() {	
	var c  = "6666";
	console.log(c);
	this.get = function(req, res) {
		console.log(c);
		res.send(c);
	}
	this.path = "/hello";
}).call(module.exports);