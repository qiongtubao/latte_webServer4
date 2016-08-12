(function() {
	var latte_lib = require("latte_lib");
		var getErrorString = function(err) {
			if(err.stack) {
				return err.stack.toString();
			}else if(latte_lib.isString(err)) {
				return err.toString();
			}else{
					var errorString;
					try {
							errorString = JSON.stringify(err);
					}catch(e){
							var Util = require("util");
							errorString = Util.inspect(err);
					}
					return errorString;
			}
		}
	this.render = function(error) {
		return getErrorString(error);
	}
}).call(module.exports);