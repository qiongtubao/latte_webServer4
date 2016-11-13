var config = {
	port: 8080,
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