(function() {
	var latte_lib = require("latte_lib");
	/**
		内置群发功能. 并不会发送给masterRpcWorker
		@method callAll

	*/
	this.master = function(data, socket, cb) {
		var _worker = this;
		if(latte_lib.isFunction(socket)) { cb = socket; socket = null; }
		if(cb) {
			
			var funcs = [];
			_worker.rpc.workers.forEach(function(worker) {
				if(!worker) { return ;}
				funcs.push(function(callback) {
					_worker.rpc.Call(worker, data.method, data.params, socket, function(error, data, socket) {
						
						callback(null, {
							error: error,
							data: data
						});
					});
				});
			});

			latte_lib.async.parallel(funcs, function(err, all) {	
				cb(err, all);
			});
		}else{
			
			this.workers.forEach(function(worker) {
				_worker.rpc.Call(worker, data.method, data.params, socket);
			});
		}

	}
	this.method = "__callAll";
}).call(module.exports);