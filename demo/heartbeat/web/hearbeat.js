(function() {
	this.get = function(req, res) {
		
		this.server.rpc.Call("hearbeat", [], function(err, data) {
			if(err) { return res.send("err")}
			res.send(JSON.stringify(data))
		});
	}
	console.log("a!");
	this.path = "/hearbeat";
}).call(module.exports);