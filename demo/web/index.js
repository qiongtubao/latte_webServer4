var config = {
	port: 10065,
	web: {
		loadPath: "./web"
	}
};
var Server = require("../../");
var server = new Server(config);
process.latte = server;
server.run();