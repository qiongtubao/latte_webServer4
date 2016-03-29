(function() {
	this.get = function(req, res) {
		var data = req.gets;
		//console.log(this);
		this.rpc.Call("test", [data.a, data.b], function(err, result) {
			if(err) {
				console.log(err);
				return res.send(err);
			}
			res.send(result);
		});
	}
	this.path = "/test";
}).call(module.exports);