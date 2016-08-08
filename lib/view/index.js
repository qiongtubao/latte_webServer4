var View = function() {
	this.views = {
		"html": require("./types/html.js"),
		"json": require("./types/json.js"),
		"latte": require("./types/latte.js")
	};
};
(function() {
	/**
		未来是可以加cache的
	*/
	this.render = function(name, fileName, opts) {
		return this.views[name].render(fileName, opts);
	}
	this.add= function(name, doFunc) {
		this.views[name] = doFunc;
	}

}).call(View.prototype);
module.exports = View;