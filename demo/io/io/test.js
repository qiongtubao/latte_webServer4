(function() {
	this.handle = function(data, callback) {
		var id = this.id;
		//群发
		clients = process.latte.ios.get("/chat/").clients;
		for(var i in clients) {
		
				clients[i].Call("test", [id, data])
			
		}
		
	}
	this.method = "test"
}).call(module.exports);