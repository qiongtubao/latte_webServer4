var config = {
	port: 8080,
	web: {
		loadPath: "./web",
		reloadTime: 1000
	},
	staticWeb: {
		paths: {
			"/": "./html/"
		}
	},
	cpus:1
};
var Server = require("../../");
var server = new Server(config);

process.latte = server;
server.run();