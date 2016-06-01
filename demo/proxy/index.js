var config = {
	port: 10065,
	proxy: {
		proxyUrl: "www.baidu.com"
	}
};
var Server = require("../../");
var server = new Server(config);
process.latte = server;
server.run();