(function() {	
	this.get = function(req, res) {
		this.rpc.Call("testRpc", [1,2], function(err, data) {
			res.send(data);
		});
		
	}
	this.path = "/k";
}).call(module.exports);