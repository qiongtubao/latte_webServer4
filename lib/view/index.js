var View = function() {
	this.views = {
		"file": require("./types/file.js").render,
		"json": require("./types/json.js").render,
		"latte": require("./types/latte.js").render,
		"error": require("./types/error.js").render
	};
};
(function() {
	/**
		未来是可以加cache的
	*/
	this.render = function(name) {
		var args = Array.prototype.slice.call(arguments, 1);
		//console.log()
		return this.views[name].apply(this.views[name], args);
	}
	this.add= function(name, doFunc) {
		this.views[name] = doFunc;
	}

}).call(View.prototype);
module.exports = View;