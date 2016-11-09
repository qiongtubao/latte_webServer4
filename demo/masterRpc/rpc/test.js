(function(){
	var num = 0;
	this.master = function(callback) {
		callback(null, ++num)
	}
	
	this.method = "test"
}).call(module.exports);