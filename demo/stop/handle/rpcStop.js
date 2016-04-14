(function() {
	this.get = function(req, res) {
		
		var self = this;
			
			self.rpc.Call("rpcStop", [], function() {
				res.send("???");
			});
			
		
	}
	this.path = "/rpcStop";
}).call(module.exports);