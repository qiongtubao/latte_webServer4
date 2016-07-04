(function(define) {'use strict'
	define("latte_web/index", ["require", "exports", "module", "window"],
 	function(require, exports, module, window) {
		/**
			@main
		*/
		module.exports = require("./server");
		(function(){
				this.Session = require("./session");
				this.Cookie = require("./cookie");
				this.Origin = require("./utils").Origin;
				this.Ip = require("./utils").Ip;
		}).call(module.exports);
  });
})(typeof define === "function"? define: function(name, reqs, factory) {factory(require, exports, module); });
