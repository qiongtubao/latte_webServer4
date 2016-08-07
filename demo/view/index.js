var config = {
	port: 10065,
	web: {
		loadPath: "./web",
		reloadTime: 1000
	},
	cpus:1
};
var Server = require("../../");
var server = new Server(config);

process.latte = server;
server.run();
server.doSlave(function() {
	server.web.addView("jade", require("latte_web_jadeView"));
});
