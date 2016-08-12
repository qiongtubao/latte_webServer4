(function() {
	this.get = function(req, res) {
		res.sendView("file", "./view/index.html",req, res, { 
			cache: 1000,
			gzip: 1024  * 10
		});
	}
	this.path = "/html";
}).call(module.exports);	