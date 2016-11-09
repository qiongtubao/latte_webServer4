var config = {
	port: 10065,
	staticWeb: {
		paths: {
			"/": "./html/"
		}
	},
	io: {
		"/chat/": {
			loadPath: "./io",
			reloadTime: 1000
		}
	},
	
	cpus:1
};
var Server = require("../../");
var server = new Server(config);
process.latte = server;
server.run();