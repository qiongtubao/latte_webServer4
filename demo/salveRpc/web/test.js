(function() {
	process.num = 0;
	this.get = function(req, res) {
		process.num++;
		process.latte.rpc.Call("test", [], function(err, data) {
			res.sendView(
				"json",{
				err: err,
				data: data
			});
		});
	}
	this.path = "/test"
}).call(module.exports);