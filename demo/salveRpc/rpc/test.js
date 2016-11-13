(function(){
	var num = 0;
	this.master = function(callback) {
		process.latte.rpc.CallAll("test",[], function(err , data) {
			callback(err, data)
		})
	}
	this.slave = function(callback) {
		callback(null, process.num)
	}
	this.method = "test"
}).call(module.exports);