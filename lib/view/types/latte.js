(function(){
	var latte_lib = require("latte_lib");
	this.render = function(file, json) {
		var data = latte_lib.fs.readFileSync(file);
		var html = latte_lib.format.templateStringFormat(data, json);
		return html;
	}
}).call(module.exports);