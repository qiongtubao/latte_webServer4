#!/usr/bin/env node
(function(define) {'use strict'
	define("latte_web4/bin/command/start", ["require", "exports", "module", "window"], 
		function(require, exports, module, window) {
			var Path = require("path")
		
			var GetConfig = function() {
				var config;
				var index = process.argv.indexOf("-c");
				if(index != -1) {
					config = process.argv[index+1];
				}
				config = config || "./.latte/web.json";
				var buildConfigPath = Path.join(process.cwd()+"/"+config);
				var buildConfig;
				try {
					buildConfig = require(buildConfigPath);
				}catch(e) {
					return null;
				}
				return buildConfig;
			};
		var start  = function() {
				var config = GetConfig();
				config = config || {
					port : 11111,
					cpus: 1
				};

				var Server = require("../../lib");
	            var server = new Server(config);
	            
	            server.run();
	    }
	    module.exports = start;
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });