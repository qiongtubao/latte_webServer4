var config = {
	port: 10065,
	web: {
		loadPath: "./web"
	},
	rpc: {
		loadPath: "./rpc"
	},
	cpus:1
};
var Server = require("../../");
var server = new Server(config);
process.latte = server;
server.doMaster(function() {
	var timeout = 60 * 1000;
	var startTime = Date.now();
	var doTime = startTime + timeout;
	var self = this;
	var run = function() {
		setTime(function(){
			
			self.CallAll("hearbeat",[doTime], function(err, data) {
				data.time = doTime;
				Log(data);
			});
			doTime += timeout;
		}, doTime - Date.now());
	}
	
});
server.run();