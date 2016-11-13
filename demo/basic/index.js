var config = {
    port: 8080, //设置端口号
    cpus:1  //设置进程数
}; //启动web服务器的配置
var Server = require("../../"); //引入本库
var server = new Server(config); //创建服务器对象
process.latte = server;  //将服务器对象设为公用对象
server.run();  //启动服务器