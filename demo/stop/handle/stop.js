(function() {
	this.get = function(req, res) {
		/**
		console.log(this);
		this.rpc.CallAll("stop",[], function() {
			res.end("???");
		});
		*/
		var self = this;
		
			var cluster = require('cluster');
			console.log( "runing",cluster.worker.id);
			
			self.rpc.CallAll("stop", [], function() {
				res.send("???");
			});
			
		
	}
	this.path = "/stop";
}).call(module.exports);