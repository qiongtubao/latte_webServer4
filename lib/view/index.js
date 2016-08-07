var View = function() {
	this.views = {

	};
};
(function() {
	this.render = function(name, fileName, opts) {
		return this.views[name].render(fileName, opts);
	}
	this.add= function(name, doFunc) {
		this.views[name] = doFunc;
	}

}).call(View.prototype);
module.exports = View;