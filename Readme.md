# latte_webServer4
index.js
```js
var config = {
	port: 8080,
	web: {
		loadPath: "./web",
		reloadTime: 1000
	},
	cpus:1
};
var Server = require("latte_webServer4");
var server = new Server(config);
process.latte = server;
server.run();
```

web/index.js
```js
(function() {
	this.get = function(req, res) {
		res.send("");
	}
	this.path = "/";
}).call(module.exports);	
```

```bash
$ node index.js
```

open http://127.0.0.1:8080