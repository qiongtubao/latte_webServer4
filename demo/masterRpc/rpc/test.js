(function(){
	var num = 0;
	this.master = function(callback) {
		throw new Error("testing")
		callback(null, ++num)
	}
	
	this.method = "test"
}).call(module.exports);