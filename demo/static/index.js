var config = {
	port: 10065,
	staticWeb: {
		paths: {
			"/": "./html"
		}
	}

};
var Server = require("../../");
var server = new Server(config);
process.latte = server;
server.run();