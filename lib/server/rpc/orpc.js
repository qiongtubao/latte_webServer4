		var latte_lib = require("latte_lib");
			var latte_watch = require("latte_watch");
			var Modules = require("latte_require");
			var Load = require("../Load");
			var defaultConfig = {
				
			};
      function RPC(config) {
        if(latte_lib.isString(config)) {
			     config = { path: config }
		    };
  		this.config = latte_lib.merger(defaultConfig, config);
          this.methods =  {};
          this.watcher = null;
          this.id = 0;
          Load.call(this, config);
        
        
          //this.start();
      };
      latte_lib.inherits(RPC, Load);
      (function() {
      		this.setMethod = function(method, func) {
	          this.methods[method] = func;
	        }
       
        this.Call = function(method, params, socket, cb) {
          var self = this;
          if(latte_lib.isFunction(socket)) {
            cb = socket;
            socket = null;
          }

          this.write({
            method: method,
            params: params,
            id: ++self.id
          }, socket);
          if(cb) {
            this.once(self.id, cb);
          }
        }
        this.setMethod = function(method, func) {
          this.methods[method] = func;
        }
          var backData = function(err, result, id) {
              return {
                error: err,
                result : result,
                id: id
              };
          }
        this.addWorker = function(worker) {
          var self = this;
          worker.rpc = this;
          worker.process.on("message", function(data, socket) {
            if(socket) {
              socket.readable = socket.writeable = true;
              socket.resume();
            }
            
            if(data.method) {
              var method = self.methods[data.method];

              if(method) {
                if(!latte_lib.isArray(data.params)) {
                  data.params = [].concat(data.params);
                }
                socket && data.params.push(socket);
                data.params.push(function(err, result, s) {
                    worker.send(backData(err, result, data.id), s);
                });
        				try {
        					 method.apply(worker, data.params);
        				}catch(e) {
                  console.log("?", e);
        					self.emit("error", e);
        				}

              }
            }else if(data.id) {
             
              self.emit(data.id, data.error, data.result, socket);
            }
          });
        }
      }).call(RPC.prototype);
		module.exports = RPC;