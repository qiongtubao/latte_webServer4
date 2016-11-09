var config = {
	port: 10065,
	cpus:1
};
var Server = require("../../");
var server = new Server(config);
server.run();