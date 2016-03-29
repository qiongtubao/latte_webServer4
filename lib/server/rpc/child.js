(function(define) {'use strict'
	define("latte_qiniu/lib/child", ["require", "exports", "module", "window"],
 	function(require, exports, module, window) {
 		var 
 		var rpcs = {
 			load: load
 		};
 		var load = function(path) {
			if(Path.isFile()) {
				loadFile(path);
			}else{
				loadDir(path);
			}
		}
 		var loadFile = function(path) {
 			var handle = loader.require(path);
 			if(handle.method) {
 				rpcs[handle.method] = hadle.master;
 			}
 		}
 		var loadDir = function(path) {
 			Path.dir(path).forEach(function(fileName) {
 				load(path+"/"+fileName)
 			});
 		}
 		process.on("message", function(m) {
 			rpcs[m.type].apply(m.data);
 		});
 	});
})(typeof define === "function"? define: function(name, reqs, factory) {factory(require, exports, module); });