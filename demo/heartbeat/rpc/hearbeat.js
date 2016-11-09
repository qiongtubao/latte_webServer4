(function() {
	this.slave = function( callback) {	
		console.log(this.rpc.server.httpCount)
		callback(null , {
			socketNum: this.rpc.server.httpCount,
			momory: process.memoryUsage()
		});
	}
	
	this.master = function(callback) {
		var time = Date.now();
		this.rpc.CallAll("hearbeat", [], function(err, data){
			callback(err, {
				master: {
					momory: process.memoryUsage()
				},
				slaves: data,
				startTime: time,
				queryTime: Date.now() - time
			});
		});
	}
	this.method = "hearbeat";
}).call(module.exports);