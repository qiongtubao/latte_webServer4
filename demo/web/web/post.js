(function() {
	//这里改成post了啊。。
	this.post = function(req, res) {
		res.send("data:"+(parseInt(req.posts["a"]) + parseInt(req.posts["b"])));//返回内容  
	}
	this.path = "/post"; //route的路径
}).call(module.exports);