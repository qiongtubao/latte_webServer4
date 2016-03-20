var config = {
	web: "./handle",
	port: 10065,
	rpc: "./rpc"
};
var Server = require("");
var server = new Server(config);
process.latte = server;