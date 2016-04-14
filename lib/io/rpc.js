(function(define) { //'use strict';
	define("latte_web/io/rpc", ["require", "exports", "module", "window"],
	function(require, exports, module, window) {
    var latte_lib = require("latte_lib");
    var defaultConfig = {};
    (function() {
			this.log = 0;
    }).call(defaultConfig);
    /**
      更新无法刷新  只能退回到latte_require的方式来实现 重新修改了
    */
    function Rpc(config) {
      if(latte_lib.isString(config)) {
        config = {
          path: config
        }
      }
      config = latte_lib.merger(defaultConfig, config);
      this.config = config;
      this.methods = {};
      this.id = 0;
      this.load(config.path);
    };
    (function() {
			
      this.load = function(path) {
        var self = this;
        var stat = latte_lib.fs.statSync(path);
        if(stat.isFile()) {
          self.loadFile(path);
        }else if(stat.isDirectory()) {
          var files = latte_lib.fs.readdirSync(path);
          files.forEach(function(filename) {
            self.load(path + "/" + filename);
          });
        }
      }
      this.loadFile = function(path) {
        var self = this;
        var o;
        try {
          o = require(process.cwd() + "/"+path);
        }catch(err) {
          if(self.config.log) {
            var filename = "./logs/loadWebRpc/"+latte_lib.format.dateFormat()+".log";
            latte_lib.fs.writeFile(filename,  latte_lib.getErrorString(err));
          }else{
            throw err;
          }
          return ;
        }
        if(o.master) {
          self.Set(o.method, o.master);
        }
      }
      this.Set = function(method, fn) {
        this.methods[method] = fn;
      }
        var backData = function(err, result, id) {
          return {
            error: err,
            result: result,
            id: id
          };
        };
      this.addSocket = function(socket) {
        var self = this;
        socket.Call = function(method, params, callback) {
          socket.send(JSON.stringify({
            method: method,
            params: params,
            id: ++self.id
          }));
          callback && self.once(self.id, callback.bind(socket));
        }
        socket.on("message", function(data) {
          try {
              data = JSON.parse(data);
			  //console.log(data, self.methods);
          }catch(e) {
              return;
          }
          if(data.method) {
            var method = self.methods[data.method];
            if(method) {
              if(!latte_lib.isArray(data.params)) {
                data.params = [].concat(data.params);
              }
              data.params.push(function(err, result) {
								socket.send(JSON.stringify(backData(err, result, data.id)))
							});
							try {
								method.apply(socket, data.params);
							}catch(e) {
								console.log(e);
							}

            }
          }else if(data.id) {
            socket.emit(data.id, data.error, data.result);
          }
        });
      }
    }).call(Rpc.prototype);
    module.exports = Rpc;
  });
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
