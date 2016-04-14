(function() {
	this.get = function(req, res) {
		var cluster = require('cluster');
		console.log( "runing",cluster.worker.id);
		res.send("hello");
	}
	this.path = "/hello";
}).call(module.exports);