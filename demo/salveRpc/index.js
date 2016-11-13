/**
	cpus设置就可以到返回数组个数
	启动之后
	1.访问http://127.0.0.1:10065
	2.会到路由web/test.js
	3.到rpc／test.js->master  请求到各进程中的rpc/test.js->salve
	4.rpc  返回到web/test.js
*/
var config = {
	port: 8080,
	rpc: {
		loadPath:"./rpc"
	},
	web: {
		loadPath: "./web"
	},
	cpus:2
};
var Server = require("../../");
var server = new Server(config);
process.latte = server;
server.run();