var config = {
	port: 8080,
	proxy: {
		paths: {
			"/baidu":"www.baidu.com"
		}
	}
};
var Server = require("../../");
var server = new Server(config);
process.latte = server;
server.run();