(function() {

var LATTE_NAMESPACE = "latte";
var global = (function() {
    return this;
})();
if (!LATTE_NAMESPACE && typeof requirejs !== "undefined")
return;

var _define = function(module, deps, payload) {
    if (typeof module !== 'string') {
        if (_define.original)
            _define.original.apply(window, arguments);
        else {
            console.error('dropping module because define wasn\'t a string.');
            console.trace();
        }
        return;
    }

    if (arguments.length == 2)
        payload = deps;

    if (!_define.modules) {
        _define.modules = {};
        _define.payloads = {};
    }
    
    _define.payloads[module] = payload;
    _define.modules[module] = null;
};

var _require = function(parentId, module, callback) {
    if (Object.prototype.toString.call(module) === "[object Array]") {
        var params = [];
        for (var i = 0, l = module.length; i < l; ++i) {
            var dep = lookup(parentId, module[i]);
            if (!dep && _require.original)
                return _require.original.apply(window, arguments);
            params.push(dep);
        }
        if (callback) {
            callback.apply(null, params);
        }
    }
    else if (typeof module === 'string') {
        var payload = lookup(parentId, module);
        if (!payload && _require.original)
            return _require.original.apply(window, arguments);

        if (callback) {
            callback();
        }

        return payload;
    }
    else {
        if (_require.original)
            return _require.original.apply(window, arguments);
    }
};

var resolve = function(parentId, moduleName) {
    if(moduleName.charAt(0) == ".") {
        var ps = parentId.split("/");
        var base = ps.pop();
        //var paths = ps.join("/");
        var ms = moduleName.split("/");
        var n ;
        while((n = ms.shift())) {
          if(n == "..") {
            ps.pop();
          }else if(n != "."){
            ps.push(n);
          }
        }
        return ps.join("/");
    }
    return moduleName;

}

var normalizeModule = function(parentId, moduleName) {
    // normalize plugin requires
    if (moduleName.indexOf("!") !== -1) {
        var chunks = moduleName.split("!");
        return normalizeModule(parentId, chunks[0]) + "!" + normalizeModule(parentId, chunks[1]);
    }
    // normalize relative requires
    /*if (moduleName.charAt(0) == ".") {
        var base = parentId.split("/").slice(0, -1).join("/");
        moduleName = base + "/" + moduleName;

        while(moduleName.indexOf(".") !== -1 && previous != moduleName) {
            var previous = moduleName;
            moduleName = moduleName.replace(/\/\.\//, "/").replace(/[^\/]+\/\.\.\//, "");
        }
    }*/
    //console.log(parentId, moduleName);
    name = resolve(parentId, moduleName);
    //console.log(parentId, moduleName, name);
    return name;
};
var lookup = function(parentId, moduleName) {

    moduleName = normalizeModule(parentId, moduleName);

    var module = _define.modules[moduleName];
    if (!module) {
        module = _define.payloads[moduleName];
        if (typeof module === 'function') {
            var exports = {};
            var mod = {
                id: moduleName,
                uri: '',
                exports: exports,
                packaged: true
            };

            var req = function(module, callback) {
                return _require(moduleName, module, callback);
            };

            var returnValue = module(req, exports, mod, global);
            exports = returnValue || mod.exports;
            _define.modules[moduleName] = exports;
            delete _define.payloads[moduleName];
        }
        module = exports || module;
        if(!module && moduleName.indexOf(".js") == -1) {
            module = _define.modules[moduleName] = lookup(parentId, moduleName + ".js");
        }
        if(!module && moduleName.indexOf("/index") == -1) {
            module = _define.modules[moduleName] = lookup(parentId, moduleName+"/index");
        }
        if(!module && moduleName.indexOf("/index.js") == -1) {
            module = _define.modules[moduleName] = lookup(parentId, moduleName+"/index.js");
        }

    }
    if(!module) {
      console.log("unload error",parentId, moduleName);
    }
     _define.modules[moduleName]  = module;
    return module;
};

function exportWindow(ns) {
    var require = function(module, callback) {
        return _require("", module, callback);
    };    

    var root = global;
    if (ns) {
        if (!global[ns])
            global[ns] = {};
        root = global[ns];
    }

    if (!root.define || !root.define.packaged) {
        _define.original = root.define;
        root.define = _define;
        root.define.packaged = true;
    }

    if (!root.require || !root.require.packaged) {
        _require.original = root.require;
        root.require = require;
        root.require.packaged = true;
        root.require.find = function(path, all) {
            var pathStrNum = path.length;
            var callbackArray = [];
            Object.keys(_define.modules).forEach(function(p) {
                if(p.indexOf(path) == 0) {
                    var nPath = p.substring(pathStrNum);
                    if(all) {
                        callbackArray.push(nPath);
                    }else{
                        if(nPath.indexOf("/") == -1) {
                            callbackArray.push(nPath);
                        }
                    }
                    
                }
            });
            return callbackArray;
        }
    }
}

exportWindow(LATTE_NAMESPACE);
    //window._require = require;
    
})();
latte.global = this;
this.define = latte.define;

latte.config = {};
(function() {
    this.config = {};
}).call(latte);
(function(define) {'use strict'
define("latte_lib/array.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
	var latte_lib = require("./lib.js")
		, events = require("./events.js")
		, LatteObject = require("./object");
		/*
			相关的splice 等返回事件  请返回latteObject 而不是Object对象   现在还没全修改完
			2016-7-7
		*/
	var LatteArray = function(data) {
		var self = this;
		this.data = [];
			var doEvent = function(name, value, oldValue) {
				var index = self.data.indexOf(this);
				if(index != -1) {
					self.emit(index + "." + name, value, oldValue, data);
					self.emit("change", index + "." + name, value, oldValue, data);
				}else{
					removeEvent(this);
				}
				
			};
			var addEvent = function(value) {
				
				value.on("change", doEvent);
				
			};
			var removeEvent = function(value) {
				if(LatteObject.isLatteObject(value)) {
					value.off("change", doEvent);
				}
			};
		(function init() {
			data.forEach(function(o, i) {
				var n = LatteObject.create(o);
				if(n) {
					addEvent(n);
					self.data[i] = n;
				}else{
					self.data[i] = o;
				}
			});
		})();

		/**
			var data = latte_lib.object.create({
				list: []
			});
			data.on("list", function(value, list) {
				
			});
			data.set("list", [1,2,3]);
		*/
		var set = function(key, value, mode) {
			if(!latte_lib.isArray(key)) {
				key = key.toString().split(".");
			}
			if(key.length == 1) {
				var k = key[0];
				var ov = self.data[k];
				var od = data[k];
				var nv;
				switch(mode) {
					case 1:
						
					break;
					default:
						removeEvent(ov);
						var nv = LatteObject.create(value);
						if(nv) {
							addEvent(nv);
						}else{
							nv = value;
						}
						self.data[k] = nv;
						data[k] = value;
						return {
							ov: ov,
							nv: nv
						};
					break;
				}

			}else{
				var k = key.pop();
				return self.get(key).set(k, value, mode);
			}
		};
		this._set = set;

		this.set = function(key, value, mode) {
			var result = set(key, value , mode);

			if(key.indexOf(".") == -1) {
				self.emit("change", key, result.nv, result.ov);
				
				self.emit(key, result.nv, result.ov);
			}
			self.emit("set", key, result.nv, result.ov);
			
			return result;
		}

		this.get = function(key) {
			if(key == "this" &&  !self.data[key]) {
				return self;
			}
			if(!latte_lib.isArray(key)) {
				key = key.toString().split(".");
			}
			
			var v = self;
			if(key.length == 1) {
				return self.data[key[0]];
			}else{
				var k = key.shift();
				return self.data[k].get(key);
			}
		}
		/**
			@method push
			@param o {any}
		*/
		this.push = function(o) {
			var key = self.data.length;
			var data = set(key, o);
			self.emit("splice", key, [], [data.nv]);
			self.emit("change", key, data.nv);
		}

		this.pop = function() {
			var data = set(self.length - 1, null);
			self.data.pop();
			self.emit("splice", self.length, [data.ov], []);
		}
		/**
			var data = latte_lib.object.create({
				a: [{
					c:1
				}],
				b:[1]
			});
			data.get("a").on("splice", function(index, removeArray, addArray) {
				
			});
			data.get("a").shift();

			data.get("b").on("splice", function(index, removeArray, addArray) {
				
			});
			data.get("b").shift();
		*/
		this.shift = function() {
			var old = self.data.shift();
			removeEvent(old);
			self.emit("splice", 0, [old],[]);
			for(var i = 0, len = self.data.length; i < len; i++) {
				self.emit("change", i, self.data[i]);
			}
			self.emit("change", self.data.length, null);
		}

		this.unshift = function() {
			var args = Array.prototype.map.call(arguments, function(value) {
				var o = LatteObject.create(value);
				if(o) {
					o.on("change", doEvent);
				}
				return o || value;
			});
			self.data.unshift.apply(self.data, args);
			self.emit("splice", 0, [], args);

			for(var i = 0, len = self.data.length; i < len; i++) {
				self.emit("change", i, self.data[i]);
			}
		}

		this.splice = function(startIndex, num) {
			var oLength = self.data.length;
			var adds = Array.prototype.splice.call(arguments, 2).map(function(o) {
				var n = LatteObject.create(o);
				if(n) {
					n.on("change", doEvent);
				}
				return n || o;
			});	
			var olds = [];
			for(var i = 0; i < num; i++) {
				var old = self.get(startIndex+i);
				if(old){
					removeEvent(old);
					olds.push(old);
				}
				
			}
			self.data.splice.apply(self.data, [startIndex, num].concat(adds));
			self.emit("splice", startIndex, olds, adds);

			for(var i = 0, len = Math.max(oLength, self.data.length); i < len; i++) {
				self.emit("change", i, self.data[i]);
			}
		}

		this.toJSON = function() {
			return data;
		}

		this.indexOf = function(data) {
			return self.data.indexOf(data);
		}
		this.forEach = function(callback) {
			self.data.forEach(callback);
		};

		this.map = function(callback) {
			return self.data.map(callback);
		}

		this.filter = function(callback) {
			return self.data.filter(callback);
		}
		
		Object.defineProperty(self, "length", {
			get: function() {
				return self.data.length;
			},
			set: function(value) {
				throw new Error("暂时没处理")
			}
		});


		this.getKeys = function() {
			return Object.keys(self.data);
		}
	};
	latte_lib.inherits(LatteArray, events);
	(function() {

	}).call(LatteArray);
	module.exports = LatteArray;
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/async.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

		var latte_lib = require("./lib.js");
		if(!latte_lib) {
			console.log("no load lib");
		}
		/**
		*	@class async
		*	@namespace latte_lib
		*	@module basic
		*/
		(function() {
			var _self = this;
			this.setImmediate = latte_lib.setImmediate;
			/**
			*	单次执行
			*	@method only_once
			*	@static
			*	@param    {function}  fn   只执行一次的函数
			*	@public
			*	@async
			*	@since 0.0.1
			*	@example

					var async = require("latte_lib").async;
					var f = async.only_once(function(data) {
						log(data);
					});
					f("a");
					f("b");
					//"a"
					//error  callback was already called.
			*/
			var only_once = this.only_once = function(fn) {
				var called = false;
				return function() {
					if (called) throw new Error("Callback was already called.");
					called = true;
					fn.apply(_self, arguments);
				}
			};
			/**
			*	并行执行
			*	@method forEach
			*	@static
			*	@param   arr   {array}  需要被执行函数的数组
			*	@param   iterator  {function}  执行函数
			*	@param   callback  {function}  回调函数
			*	@async
			*	@since 0.0.1
			*	@example

					var async = require("latte_lib").async;
					var result = [];
					async.forEach([1,2,3,4], function(data, callback) {
						if(data == 3) {
							callback("is 3");
						}else{
							result.push(data * 2);
							callback();
						}
					}, function(err, data) {
						log(err); //is 3
						log(result);// [2,4]
					});

					var result2 = [];
					async.forEach([1,2,3,4], function(data, callback) {
						if(data == 3) {
							setTimeout(function() {
								callback("is 3");
							}, 1);
						}else{
							result2.push(data * 2);
							callback();
						}
					}, function(err, data) {
						log(err); //is 3
						log(result2);// [2,4,8]
					});
			*
			*/
			this.forEach = this.each = function(arr, iterator, callback) {
				callback = callback || function(){};
				if(!arr.length) {
					return callback();
				}
				var completed = 0;
				latte_lib.forEach(arr, function (x) {
		            iterator(x, only_once(done) );
		        });
		        function done(err) {
		          if (err) {
		              callback(err);
		              callback = function () {};
		          }
		          else {
		              completed += 1;
		              if (completed >= arr.length) {
		                  callback();
		              }
		          }
		        }
			};

			/**
				串行执行
				@method forEachSeries
				@static
				@param   arr   {array}  需要被执行函数的数组
				@param   iterator  {function}  执行函数
				@param   callback  {function}  回调函数
				@sync
				@since 0.0.1
				@example
					var async = require("latte_lib").async;
					var result = [];
					async.forEachSeries([1,2,3,4], function(data, callback) {
						if(data == 3) {
							callback("is 3");
						}else{
							result.push(data * 2);
							callback();
						}
					}, function(err, data) {
						log(err); //is 3
						log(result);// [2,4]
					});

					var result2 = [];
					async.forEachSeries([1,2,3,4], function(data, callback) {
						if(data == 3) {
							setTimeout(function() {
								callback("is 3");
							}, 1);
						}else{
							result2.push(data * 2);
							callback();
						}
					}, function(err, data) {
						log(err); //is 3
						log(result2);// [2,4,8]
					});
			*/
			this.forEachSeries = this.eachSeries = function(arr, iterator, callback) {
				callback = callback || function() {};
				if (!arr.length) {
		            return callback();
		        }
		        var completed = 0;
		        (function iterate() {
		            iterator(arr[completed], function (err) {
		                if (err) {
		                    callback(err);
		                    callback = function () {};
		                }
		                else {
		                    completed += 1;
		                    if (completed >= arr.length) {
		                        callback();
		                    }
		                    else {
		                        iterate();
		                    }
		                }
		            });
		        })();
			};

			this.forEachLimit = this.eachLimit = function(arr, limit, iterator, callback) {
				var fn = _eachLimit(limit);
	        	fn.apply(null, [arr, iterator, callback]);
			};

			var _eachLimit = function(limit) {
				return function(arr, iterator, callback) {
					callback = callback || function() {};
					if (!arr.length || limit <= 0) {
		                return callback();
		            }
		            var completed = 0;
		            var started = 0;
		            var running = 0;
	             	(function replenish () {
		                if (completed >= arr.length) {
		                    return callback();
		                }

		                while (running < limit && started < arr.length) {
		                    started += 1;
		                    running += 1;
		                    iterator(arr[started - 1], function (err) {
		                        if (err) {
		                            callback(err);
		                            callback = function () {};
		                        }
		                        else {
		                            completed += 1;
		                            running -= 1;
		                            if (completed >= arr.length) {
		                                callback();
		                            }
		                            else {
		                                replenish();
		                            }
		                        }
		                    });
		                }
		            })();
				};
			};

			var doParallel = function (fn) {
		        return function () {
		            var args = Array.prototype.slice.call(arguments);
		            return fn.apply(null, [_self.each].concat(args));
		        };
		    };

		    var doParallelLimit = function(limit, fn) {
		        return function () {
		            var args = Array.prototype.slice.call(arguments);
		            return fn.apply(null, [_eachLimit(limit)].concat(args));
		        };
		    };

		    var doSeries = function (fn) {
		        return function () {
		            var args = Array.prototype.slice.call(arguments);
		            return fn.apply(null, [_self.eachSeries].concat(args));
		        };
		    };

		    var _asyncMap = function(eachfn, arr, iterator, callback) {
		    	arr = latte_lib.map(arr, function(x, i) {
		    		return {
		    			index: i,
		    			value: x
		    		};
		    	});
		    	if (!callback) {
		            eachfn(arr, function (x, callback) {
		                iterator(x.value, function (err) {
		                    callback(err);
		                });
		            });
		        } else {
		            var results = [];
		            eachfn(arr, function (x, callback) {
		                iterator(x.value, function (err, v) {
		                    results[x.index] = v;
		                    callback(err);
		                });
		            }, function (err) {
		                callback(err, results);
		            });
		        }
		    };

		    this.map = doParallel(_asyncMap);
		    this.mapSeries = doSeries(_asyncMap);

		    var _mapLimit = function(limit) {
		        return doParallelLimit(limit, _asyncMap);
		    };

		    this.mapLimit = function(arr, limit, iterator, callback) {
		    	return _mapLimit(limit)(arr, iterator, callback);
		    };

		    this.inject = this.foldl = this.reduce = function(arr, memo, iterator, callback) {
		    	_self.eachSeries(arr, function(x, callback) {
		    		iterator(memo, x, function (err, v) {
		                memo = v;
		                callback(err);
		            });
		    	}, function (err) {
		            callback(err, memo);
		        });
		    };

		    this.foldr = this.reduceRight = function (arr, memo, iterator, callback) {
		        var reversed = latte_lib.map(arr, function (x) {
		            return x;
		        }).reverse();
		        _self.reduce(reversed, memo, iterator, callback);
		    };
		    var _filter = function (eachfn, arr, iterator, callback) {
		        var results = [];
		        arr = latte_lib.map(arr, function (x, i) {
		            return {index: i, value: x};
		        });
		        eachfn(arr, function (x, callback) {
		            iterator(x.value, function (v) {
		                if (v) {
		                    results.push(x);
		                }
		                callback();
		            });
		        }, function (err) {
		            callback(latte_lib.map(results.sort(function (a, b) {
		                return a.index - b.index;
		            }), function (x) {
		                return x.value;
		            }));
		        });
		    };

		    this.select = this.filter = doParallel(_filter);
	    	this.selectSeries = this.filterSeries = doSeries(_filter);

	    	var _reject = function (eachfn, arr, iterator, callback) {
		        var results = [];
		        arr = latte_lib.map(arr, function (x, i) {
		            return {index: i, value: x};
		        });
		        eachfn(arr, function (x, callback) {
		            iterator(x.value, function (v) {
		                if (!v) {
		                    results.push(x);
		                }
		                callback();
		            });
		        }, function (err) {
		            callback(latte_lib.map(results.sort(function (a, b) {
		                return a.index - b.index;
		            }), function (x) {
		                return x.value;
		            }));
		        });
		    };

		    this.reject = doParallel(_reject);
	 		this.rejectSeries = doSeries(_reject);

	 		var _detect = function (eachfn, arr, iterator, main_callback) {
		        eachfn(arr, function (x, callback) {
		            iterator(x, function (result) {
		                if (result) {
		                    main_callback(x);
		                    main_callback = function () {};
		                }
		                else {
		                    callback();
		                }
		            });
		        }, function (err) {
		            main_callback();
		        });
		    };

		    this.detect = doParallel(_detect);
		 	this.detectSeries = doSeries(_detect);

		 	this.any = this.some = function(arr, iterator, main_callback) {
		 		_self.each(arr, function (x, callback) {
		            iterator(x, function (v) {
		                if (v) {
		                    main_callback(true);
		                    main_callback = function () {};
		                }
		                callback();
		            });
		        }, function (err) {
		            main_callback(false);
		        });
		 	};

		 	this.all = this.every = function (arr, iterator, main_callback) {
		        _self.each(arr, function (x, callback) {
		            iterator(x, function (v) {
		                if (!v) {
		                    main_callback(false);
		                    main_callback = function () {};
		                }
		                callback();
		            });
		        }, function (err) {
		            main_callback(true);
		        });
		    };

		    this.sortBy = function (arr, iterator, callback) {
		        _self.map(arr, function (x, callback) {
		            iterator(x, function (err, criteria) {
		                if (err) {
		                    callback(err);
		                }
		                else {
		                    callback(null, {value: x, criteria: criteria});
		                }
		            });
		        }, function (err, results) {
		            if (err) {
		                return callback(err);
		            }
		            else {
		                var fn = function (left, right) {
		                    var a = left.criteria, b = right.criteria;
		                    return a < b ? -1 : a > b ? 1 : 0;
		                };
		                callback(null, latte_lib.map(results.sort(fn), function (x) {
		                    return x.value;
		                }));
		            }
		        });
		    };
		    /**
		    	自动 并行 如果有依赖的话等依赖好了在执行
		    	@method auto
		    	@static
		    	@param {json} tasks
				@param {function} callback
				@async
				@since 0.0.1
				@example

					var async = require("latte_lib").async;
					async.auto({
						a: ["c",function(callback) {
							log("a");
							callback(null,3);
						}],
						b: function(callback) {
							log("b");
							callback(null, 1);
						},
						c: function(callback) {
							log("c");
							callback(null, 2);
						},
						d: ["a", function(callback) {
							log("d");
							callback(null, 4);
						}]
					}, function(err, results) {
						log("err:",err);
						log("results:", results);// {"b":1,"c":2,"a":3,"d":4}
					});


					async.auto({
						a: ["c",function(callback) {
							log("a");
							callback("is 3", 3);
						}],
						b: function(callback) {
							log("b");
							callback(null, 1);
						},
						c: function(callback) {
							log("c");
							callback(null, 2);
						},
						d: ["a", function(callback) {
							log("d");
							callback(null, 4);
						}]
					}, function(err, results) {
						log("err:",err);	// is 3
						log("results:", results);// {"b":1,"c":2, "a":3}
					});
		    */
		    this.auto = function (tasks, callback) {
		        callback = callback || function () {};
		        var keys = latte_lib.keys(tasks);
		        var remainingTasks = keys.length
		        if (!remainingTasks) {
		            return callback();
		        }

		        var results = {};

		        var listeners = [];
		        var addListener = function (fn) {
		            listeners.unshift(fn);
		        };
		        var removeListener = function (fn) {
		            for (var i = 0; i < listeners.length; i += 1) {
		                if (listeners[i] === fn) {
		                    listeners.splice(i, 1);
		                    return;
		                }
		            }
		        };
		        var taskComplete = function () {
		            remainingTasks--
		            latte_lib.forEach(listeners.slice(0), function (fn) {
		                fn();
		            });
		        };

		        addListener(function () {
		            if (!remainingTasks) {
		                var theCallback = callback;
		                // prevent final callback from calling itself if it errors
		                callback = function () {};

		                theCallback(null, results);
		            }
		        });

		        latte_lib.forEach(keys, function (k) {
		            var task = latte_lib.isArray(tasks[k]) ? tasks[k]: [tasks[k]];
		            var taskCallback = function (err) {
		                var args = Array.prototype.slice.call(arguments, 1);
		                if (args.length <= 1) {
		                    args = args[0];
		                }
		                if (err) {
		                    var safeResults = {};
		                    latte_lib.forEach(latte_lib.keys(results), function(rkey) {
		                        safeResults[rkey] = results[rkey];
		                    });
		                    safeResults[k] = args;
		                    callback(err, safeResults);
		                    // stop subsequent errors hitting callback multiple times
		                    callback = function () {};
		                }
		                else {
		                    results[k] = args;
		                    latte_lib.setImmediate(taskComplete);
		                }
		            };
		            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
		            var ready = function () {
		                return latte_lib.reduce(requires, function (a, x) {
		                    return (a && results.hasOwnProperty(x));
		                }, true) && !results.hasOwnProperty(k);
		            };
		            if (ready()) {
		                task[task.length - 1](taskCallback, results);
		            }
		            else {
		                var listener = function () {
		                    if (ready()) {
		                        removeListener(listener);
		                        task[task.length - 1](taskCallback, results);
		                    }
		                };
		                addListener(listener);
		            }
		        });
		    };

		    this.retry = function(times, task, callback) {
		        var DEFAULT_TIMES = 5;
		        var attempts = [];
		        // Use defaults if times not passed
		        if (typeof times === 'function') {
		            callback = task;
		            task = times;
		            times = DEFAULT_TIMES;
		        }
		        // Make sure times is a number
		        times = parseInt(times, 10) || DEFAULT_TIMES;
		        var wrappedTask = function(wrappedCallback, wrappedResults) {
		            var retryAttempt = function(task, finalAttempt) {
		                return function(seriesCallback) {
		                    task(function(err, result){
		                        seriesCallback(!err || finalAttempt, {err: err, result: result});
		                    }, wrappedResults);
		                };
		            };
		            while (times) {
		                attempts.push(retryAttempt(task, !(times-=1)));
		            }
		            _self.series(attempts, function(done, data){
		                data = data[data.length - 1];
		                (wrappedCallback || callback)(data.err, data.result);
		            });
		        }
		        // If a callback is passed, run this as a controll flow
		        return callback ? wrappedTask() : wrappedTask
		    };

		    this.waterfall = function (tasks, callback) {
		        callback = callback || function () {};
		        if (!latte_lib.isArray(tasks)) {
		          var err = new Error('First argument to waterfall must be an array of functions');
		          return callback(err);
		        }
		        if (!tasks.length) {
		            return callback();
		        }
		        var wrapIterator = function (iterator) {
		            return function (err) {
		                if (err) {
		                    callback.apply(null, arguments);
		                    callback = function () {};
		                }
		                else {
		                    var args = Array.prototype.slice.call(arguments, 1);
		                    var next = iterator.next();
		                    if (next) {
		                        args.push(wrapIterator(next));
		                    }
		                    else {
		                        args.push(callback);
		                    }
		                    latte_lib.setImmediate(function () {
		                        iterator.apply(null, args);
		                    });
		                }
		            };
		        };
		        wrapIterator(_self.iterator(tasks))();
		    };

		    var _parallel = function(eachfn, tasks, callback) {
		        callback = callback || function () {};
		        if (latte_lib.isArray(tasks)) {
		            eachfn.map(tasks, function (fn, callback) {
		                if (fn) {
		                    fn(function (err) {
		                        var args = Array.prototype.slice.call(arguments, 1);
		                        if (args.length <= 1) {
		                            args = args[0];
		                        }
		                        callback.call(null, err, args);
		                    });
		                }
		            }, callback);
		        }
		        else {
		            var results = {};
		            eachfn.each(latte_lib.keys(tasks), function (k, callback) {
		                tasks[k](function (err) {
		                    var args = Array.prototype.slice.call(arguments, 1);
		                    if (args.length <= 1) {
		                        args = args[0];
		                    }
		                    results[k] = args;
		                    callback(err);
		                });
		            }, function (err) {
		                callback(err, results);
		            });
		        }
		    };
		    /**
		    	并行
		    	@method parallel
		    	@async
				@param {function[]} tasks
				@param {function} callback
				@example

					var async = require("latte_lib").async;
					async.parallel([
						function(cb) {
							cb(null, 1);
						},
						function(cb) {
							setTimeout(function() {
								cb("is 2");
							}, 1);
						},
						function(cb) {
							cb(null, 3);
						}
					],function(err, result) {
						log(err);  //is 2
						log(result);//[1,null,3]
					});
		    */

		    this.parallel = function (tasks, callback) {
		        _parallel({ map: _self.map, each: _self.each }, tasks, callback);
		    };

		    this.parallelLimit = function(tasks, limit, callback) {
		        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
		    };
		    /**
		    	@method series
		    	@async
				@param {function[]} tasks
				@param {function} callback
				@example

					var async = require("latte_lib").async;
					async.series([
						function(cb) {
							cb(null, 1);
						},
						function(cb) {
							setTimeout(function() {
								cb("is 2");
							}, 1);
						},
						function(cb) {
							cb(null, 3);
						}
					],function(err, result) {
						log(err);  //is 2
						log(result);//[1,null]
					});
		    */
		    this.series = function (tasks, callback) {
		        callback = callback || function () {};
		        if (latte_lib.isArray(tasks)) {
		            _self.mapSeries(tasks, function (fn, callback) {
		                if (fn) {
		                    fn(function (err) {
		                        var args = Array.prototype.slice.call(arguments, 1);
		                        if (args.length <= 1) {
		                            args = args[0];
		                        }
		                        callback.call(null, err, args);
		                    });
		                }
		            }, callback);
		        }
		        else {
		            var results = {};
		            _self.eachSeries(_keys(tasks), function (k, callback) {
		                tasks[k](function (err) {
		                    var args = Array.prototype.slice.call(arguments, 1);
		                    if (args.length <= 1) {
		                        args = args[0];
		                    }
		                    results[k] = args;
		                    callback(err);
		                });
		            }, function (err) {
		                callback(err, results);
		            });
		        }
		    };

		    this.iterator = function (tasks) {
		        var makeCallback = function (index) {
		            var fn = function () {
		                if (tasks.length) {
		                    tasks[index].apply(null, arguments);
		                }
		                return fn.next();
		            };
		            fn.next = function () {
		                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
		            };
		            return fn;
		        };
		        return makeCallback(0);
		    };

		    this.apply = function (fn) {
		        var args = Array.prototype.slice.call(arguments, 1);
		        return function () {
		            return fn.apply(
		                null, args.concat(Array.prototype.slice.call(arguments))
		            );
		        };
		    };

		    var _concat = function (eachfn, arr, fn, callback) {
		        var r = [];
		        eachfn(arr, function (x, cb) {
		            fn(x, function (err, y) {
		                r = r.concat(y || []);
		                cb(err);
		            });
		        }, function (err) {
		            callback(err, r);
		        });
		    };
		    this.concat = doParallel(_concat);
	    	this.concatSeries = doSeries(_concat);
	    	this.whilst = function (test, iterator, callback) {
		        if (test()) {
		            iterator(function (err) {
		                if (err) {
		                    return callback(err);
		                }
		                _self.whilst(test, iterator, callback);
		            });
		        }
		        else {
		            callback();
		        }
		    };

		    this.doWhilst = function (iterator, test, callback) {
		        iterator(function (err) {
		            if (err) {
		                return callback(err);
		            }
		            var args = Array.prototype.slice.call(arguments, 1);
		            if (test.apply(null, args)) {
		                _self.doWhilst(iterator, test, callback);
		            }
		            else {
		                callback();
		            }
		        });
		    };

		    this.until = function(test, iterator, callback) {
		    	if (!test()) {
		            iterator(function (err) {
		                if (err) {
		                    return callback(err);
		                }
		                _self.until(test, iterator, callback);
		            });
		        }
		        else {
		            callback();
		        }
		    };

		    this.doUntil = function (iterator, test, callback) {
		        iterator(function (err) {
		            if (err) {
		                return callback(err);
		            }
		            var args = Array.prototype.slice.call(arguments, 1);
		            if (!test.apply(null, args)) {
		                _self.doUntil(iterator, test, callback);
		            }
		            else {
		                callback();
		            }
		        });
		    };

		    this.queue = function (worker, concurrency) {
		        if (concurrency === undefined) {
		            concurrency = 1;
		        }
		        function _insert(q, data, pos, callback) {
		          if (!q.started){
		            q.started = true;
		          }
		          if (!_isArray(data)) {
		              data = [data];
		          }
		          if(data.length == 0) {
		             // call drain immediately if there are no tasks
		             return latte_lib.setImmediate(function() {
		                 if (q.drain) {
		                     q.drain();
		                 }
		             });
		          }
		          latte_lib.forEach(data, function(task) {
		              var item = {
		                  data: task,
		                  callback: typeof callback === 'function' ? callback : null
		              };

		              if (pos) {
		                q.tasks.unshift(item);
		              } else {
		                q.tasks.push(item);
		              }

		              if (q.saturated && q.tasks.length === q.concurrency) {
		                  q.saturated();
		              }
		              latte_lib.setImmediate(q.process);
		          });
		        }

		        var workers = 0;
		        var q = {
		            tasks: [],
		            concurrency: concurrency,
		            saturated: null,
		            empty: null,
		            drain: null,
		            started: false,
		            paused: false,
		            push: function (data, callback) {
		              _insert(q, data, false, callback);
		            },
		            kill: function () {
		              q.drain = null;
		              q.tasks = [];
		            },
		            unshift: function (data, callback) {
		              _insert(q, data, true, callback);
		            },
		            process: function () {
		                if (!q.paused && workers < q.concurrency && q.tasks.length) {
		                    var task = q.tasks.shift();
		                    if (q.empty && q.tasks.length === 0) {
		                        q.empty();
		                    }
		                    workers += 1;
		                    var next = function () {
		                        workers -= 1;
		                        if (task.callback) {
		                            task.callback.apply(task, arguments);
		                        }
		                        if (q.drain && q.tasks.length + workers === 0) {
		                            q.drain();
		                        }
		                        q.process();
		                    };
		                    var cb = only_once(next);
		                    worker(task.data, cb);
		                }
		            },
		            length: function () {
		                return q.tasks.length;
		            },
		            running: function () {
		                return workers;
		            },
		            idle: function() {
		                return q.tasks.length + workers === 0;
		            },
		            pause: function () {
		                if (q.paused === true) { return; }
		                q.paused = true;
		                q.process();
		            },
		            resume: function () {
		                if (q.paused === false) { return; }
		                q.paused = false;
		                q.process();
		            }
		        };
		        return q;
		    };

		    this.priorityQueue = function(worker, concurrency) {
		    	function _compareTasks(a, b){
	          return a.priority - b.priority;
	        };

	        function _binarySearch(sequence, item, compare) {
	          var beg = -1,
	              end = sequence.length - 1;
	          while (beg < end) {
	            var mid = beg + ((end - beg + 1) >>> 1);
	            if (compare(item, sequence[mid]) >= 0) {
	              beg = mid;
	            } else {
	              end = mid - 1;
	            }
	          }
	          return beg;
	        }

	        function _insert(q, data, priority, callback) {
				if (!q.started){
					q.started = true;
				}
				if (!_isArray(data)) {
					data = [data];
				}
				if(data.length == 0) {
				// call drain immediately if there are no tasks
					return latte_lib.setImmediate(function() {
						if (q.drain) {
							q.drain();
						}
					});
				}
				  latte_lib.forEach(data, function(task) {
				      var item = {
				          data: task,
				          priority: priority,
				          callback: typeof callback === 'function' ? callback : null
				      };

				      q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

				      if (q.saturated && q.tasks.length === q.concurrency) {
				          q.saturated();
				      }
				      latte_lib.setImmediate(q.process);
				  });
				}

		        // Start with a normal queue
		        var q = _self.queue(worker, concurrency);

		        // Override push to accept second parameter representing priority
		        q.push = function (data, priority, callback) {
		          _insert(q, data, priority, callback);
		        };

		        // Remove unshift function
		        delete q.unshift;

		        return q;
		    };

		    this.cargo = function (worker, payload) {
		        var working     = false,
		            tasks       = [];

		        var cargo = {
		            tasks: tasks,
		            payload: payload,
		            saturated: null,
		            empty: null,
		            drain: null,
		            drained: true,
		            push: function (data, callback) {
		                if (!latte_lib.isArray(data)) {
		                    data = [data];
		                }
		                latte_lib.forEach(data, function(task) {
		                    tasks.push({
		                        data: task,
		                        callback: typeof callback === 'function' ? callback : null
		                    });
		                    cargo.drained = false;
		                    if (cargo.saturated && tasks.length === payload) {
		                        cargo.saturated();
		                    }
		                });
		                latte_lib.setImmediate(cargo.process);
		            },
		            process: function process() {
		                if (working) return;
		                if (tasks.length === 0) {
		                    if(cargo.drain && !cargo.drained) cargo.drain();
		                    cargo.drained = true;
		                    return;
		                }

		                var ts = typeof payload === 'number'
		                            ? tasks.splice(0, payload)
		                            : tasks.splice(0, tasks.length);

		                var ds = latte_lib.map(ts, function (task) {
		                    return task.data;
		                });

		                if(cargo.empty) cargo.empty();
		                working = true;
		                worker(ds, function () {
		                    working = false;

		                    var args = arguments;
		                    latte_lib.forEach(ts, function (data) {
		                        if (data.callback) {
		                            data.callback.apply(null, args);
		                        }
		                    });

		                    process();
		                });
		            },
		            length: function () {
		                return tasks.length;
		            },
		            running: function () {
		                return working;
		            }
		        };
		        return cargo;
		    };

		    var _console_fn = function (name) {
		        return function (fn) {
		            var args = Array.prototype.slice.call(arguments, 1);
		            fn.apply(null, args.concat([function (err) {
		                var args = Array.prototype.slice.call(arguments, 1);
		                if (typeof console !== 'undefined') {
		                    if (err) {
		                        if (console.error) {
		                            console.error(err);
		                        }
		                    }
		                    else if (console[name]) {
		                        latte_lib.forEach(args, function (x) {
		                            console[name](x);
		                        });
		                    }
		                }
		            }]));
		        };
		    };
		    this.log = _console_fn('log');
	 		this.dir = _console_fn('dir');

	 		this.memoize = function (fn, hasher) {
		        var memo = {};
		        var queues = {};
		        hasher = hasher || function (x) {
		            return x;
		        };
		        var memoized = function () {
		            var args = Array.prototype.slice.call(arguments);
		            var callback = args.pop();
		            var key = hasher.apply(null, args);
		            if (key in memo) {
		                latte_lib.nextTick(function () {
		                    callback.apply(null, memo[key]);
		                });
		            }
		            else if (key in queues) {
		                queues[key].push(callback);
		            }
		            else {
		                queues[key] = [callback];
		                fn.apply(null, args.concat([function () {
		                    memo[key] = arguments;
		                    var q = queues[key];
		                    delete queues[key];
		                    for (var i = 0, l = q.length; i < l; i++) {
		                      q[i].apply(null, arguments);
		                    }
		                }]));
		            }
		        };
		        memoized.memo = memo;
		        memoized.unmemoized = fn;
		        return memoized;
		    };

		    this.unmemoize = function (fn) {
				return function () {
					return (fn.unmemoized || fn).apply(null, arguments);
				};
		    };

		    this.times = function (count, iterator, callback) {
		        var counter = [];
		        for (var i = 0; i < count; i++) {
		            counter.push(i);
		        }
		        return _self.map(counter, iterator, callback);
		    };

		    this.timesSeries = function (count, iterator, callback) {
		        var counter = [];
		        for (var i = 0; i < count; i++) {
		            counter.push(i);
		        }
		        return _self.mapSeries(counter, iterator, callback);
		    };

		    /**
		    	@method seq
		    	@static
		    	@async
		    	@param  {function[]}     functions
		    	@return {function}
		    	@since 0.0.1
				@example

					var async = require("latte_lib").async;
					var fun = async.seq(function(a, callback) {
						log("1",a);//2
						callback(null, a+1, a-1);
					}, function(data1, data2, callback) {
						log("2",data1,data2);//3,1
						callback("is 2", (data1 + data2 + 2) / (data1- data2 + 2) );
					});
					fun(2, function(err,b,c) {
						log(err ,b,c);//is 2, 1.5
					});

		    */

		    this.seq = function (/* functions... */) {
		        var fns = arguments;
		        return function () {
		            var that = this;
		            var args = Array.prototype.slice.call(arguments);
		            var callback = args.pop();
		            _self.reduce(fns, args, function (newargs, fn, cb) {
		                fn.apply(that, newargs.concat([function () {
		                    var err = arguments[0];
		                    var nextargs = Array.prototype.slice.call(arguments, 1);
		                    cb(err, nextargs);
		                }]))
		            },
		            function (err, results) {
		                callback.apply(that, [err].concat(results));
		            });
		        };
		    };

		    this.compose = function (/* functions... */) {
		    	//颠倒参数
		      return _self.seq.apply(null, Array.prototype.reverse.call(arguments));
		    };

		    var _applyEach = function (eachfn, fns /*args...*/) {
		        var go = function () {
		            var that = this;
		            var args = Array.prototype.slice.call(arguments);
		            var callback = args.pop();
		            return eachfn(fns, function (fn, cb) {
		                fn.apply(that, args.concat([cb]));
		            },
		            callback);
		        };
		        if (arguments.length > 2) {
		            var args = Array.prototype.slice.call(arguments, 2);
		            return go.apply(this, args);
		        }
		        else {
		            return go;
		        }
		    };
		    this.applyEach = doParallel(_applyEach);
	    	this.applyEachSeries = doSeries(_applyEach);

	    	/**
	    		循环执行出现错误停止

	    		@method forever
				@static
				@param   fn   {function}  循环执行到函数
				@param   callback  {function}  循环执行出现错误之后回调函数
				@example

					var async = require("latte_lib").async;
					var i = 0;
					async.forever(function(next) {
						if(++i == 3)  {
							next("is 3");
						}else{
							log("forever", i);
							next();
						};

					}, function(err) {
						log(err);
					});
	    	*/
	    	this.forever = function (fn, callback) {
		        function next(err) {
		            if (err) {
		                if (callback) {
		                    return callback(err);
		                }
		                throw err;
		            }
		            fn(next);
		        }
		        next();
		    };
		}).call(module.exports);
	
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/co.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {




var latte_lib = require("./lib");
var slice = Array.prototype.slice;

	/**
		function -> promise
		@method thunkToPromise
		@param {Function}
		@return {Promise}
		@api private

	*/
	function thunkToPromise(fn) {
		var ctx = this;
		return new Promise(function(resolve, reject){
			fn.call(ctx, function(err, res) {
				if(err) {
					return reject(err);
				}
				if(arguments.length > 2) {
					res = slice.call(arguments, 1);
					resolve(res);
				}
			});
		});
	}
	/**
		@param {Array} obj
		@return {Promise}
		@api private
	*/
	function arrayToPromise(obj) {
		return Promise.all(obj.map(toPromise, this));
	}

	/**
		objectToPromise
	*/
	function objectToPromise(obj) {
		var results = new obj.constructor();
		var keys = Object.keys(obj);
		var promise = [];
		for(var i = 0, len = keys.length; i < len; i++) {
			var key = keys[i];
			var promise = toPromise.call(this, obj[key]);
			if(promise && isPromise(promise)) {
				defer(promise, key);
			}else{
				results[key] = obj[key];
			}
		}
		return Promise.all(promises).then(function() {
			return results
		});

		function defer(promise, key) {
			results[key] = undefined;
			promises.push(promise.then(function(res) {
				results[key] = res;
			}));
		}
	}
			var isGenerator = function(obj) {
				return latte_lib.isFunction(obj.next) && latte_lib.isFunction(obj.throw); 
			}

			var isGeneratorFunction = function(obj) {
				var constructor = obj.constructor;
				if(!constructor) {
					return false;
				}
				if(constructor.name === "GeneratorFunction" || "GeneratorFunction" === constructor.displayName) {
					return true;
				}
				return isGenerator(constructor.prototype);
			}
function toPromise(obj) {
	if(!obj) return obj;
	if(latte_lib.isPromise(obj)) return obj;
	if(isGeneratorFunction(obj) || isGenerator(obj)) return co.call(this, obj);
	if(latte_lib.isFunction(obj)) return thunkToPromise.call(this, obj);
	if(latte_lib.isArray(obj)) return arrayToPromise.call(this, obj);
	if(latte_lib.isObject(obj)) return objectToPromise.call(this, obj);
	return obj;
}

function co(gen) {
	var ctx = this;
	var args = slice.call(arguments, 1);
	return new Promise(function(resolve, reject) {
		if(latte_lib.isFunction(gen)) {
			gen = gen.apply(ctx, args);
		}
		if(!gen || latte_lib.isFunction(gen.next)) {
			return resolve(gen);
		}
		onFulfilled();

		function onFulfilled(res) {
			var ret ;
			try {
				ret = gen.next(res);
			}catch(e) {
				return rejet(e);
			}
			next(ret);
		}

		function onRejected(err) {
			var ret ;
			try {
				ret = gen.throw(err);
			}catch(e) {
				return reject(e);
			}
			next(ret);
		}

		function next(ret) {
			if(ret.done) return resolve(ret.value);
			var value = toPromise.call(ctx, ret.value);
			if(value  && isPromise(value)) {
				return value.then(onFulfilled, onRejected);
			}
			return onRejected(new TypeError("You may only yield a function,promise, generator, array, or object, "+
				"but the following object was passwed: \"" + String(ret.value)+ "\""));
		}
	});
};
co.wrap = function(fn) {
	createPromise.__generatorFunction__ = fn;
	return createPromise;
	function createPromise() {
		return co.call(this, fn.apply(this, arguments));
	}
}
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/coding/base64.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

			/**
				@namespace latte_lib
				@module coding
			  @class base64
			 */
			(function() {
				var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

					/**
						@method encode
						@param {String} input
						@return {String} output
						@example
							var Base64 = require("latte_lib").base64;
							log(Base64.encode("latte的世界"));
					*/
					this.encode = function (input) {
							var output = "";
							var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
							var i = 0;
							input = require("./utf8").encode(input);
							//input = _utf8_encode(input);
							while (i < input.length) {
									chr1 = input.charCodeAt(i++);
									chr2 = input.charCodeAt(i++);
									chr3 = input.charCodeAt(i++);
									enc1 = chr1 >> 2;
									enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
									enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
									enc4 = chr3 & 63;
									if (isNaN(chr2)) {
											enc3 = enc4 = 64;
									} else if (isNaN(chr3)) {
											enc4 = 64;
									}
									output = output +
									_keyStr.charAt(enc1) + _keyStr.charAt(enc2) +
									_keyStr.charAt(enc3) + _keyStr.charAt(enc4);
							}
							return output;
					}

					/**
						@method decode
						@param {String} input
						@return {String} output
						@example
							var Base64 = require("latte_lib").base64;
							log(Base64.decode("bGF0dGXnmoTkuJbnlYw="));
					*/
					this.decode = function (input) {
							var output = "";
							var chr1, chr2, chr3;
							var enc1, enc2, enc3, enc4;
							var i = 0;
							input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
							while (i < input.length) {
									enc1 = _keyStr.indexOf(input.charAt(i++));
									enc2 = _keyStr.indexOf(input.charAt(i++));
									enc3 = _keyStr.indexOf(input.charAt(i++));
									enc4 = _keyStr.indexOf(input.charAt(i++));
									chr1 = (enc1 << 2) | (enc2 >> 4);
									chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
									chr3 = ((enc3 & 3) << 6) | enc4;
									output = output + String.fromCharCode(chr1);
									if (enc3 != 64) {
											output = output + String.fromCharCode(chr2);
									}
									if (enc4 != 64) {
											output = output + String.fromCharCode(chr3);
									}
							}
							output = require("./utf8").decode(output);
							//output = _utf8_decode(output);
							return output;
					}


			}).call(module.exports);
  
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/coding/hex.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

		(function() {
			this.encode = function(string) {
			 	var HEX = "0123456789ABCDEF",  
				radix = 16,  
				len = string.length,  
				encodeStr = "";  
				for (var i = 0; i < len; i++) {  
					var num = parseInt(string.charCodeAt(i), 10);  
					encodeStr += "%" + Math.floor(num / radix) + HEX.charAt(num % radix);  
				}  
				return encodeStr;  
			}
			this.decode = function(string) {
				var arr = string.split("%"),  
				str = "";
				for (var i = 1; arr[i]; i++) {  
					str += String.fromCharCode(parseInt(arr[i], 16));  
				}  
				return str; 
			}
		}).call(module.exports);
		
	
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/coding/utf8.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

		/**
		*	@class utf8
		*	@namespace latte_lib
		*	@module coding
		*
		*/
		(function() {
			/**
			*	@property version
			*	@type String
			*/
			this.version = "0.0.1"
			var stringFromCharCode = String.fromCharCode;
			/**
			*	@method ucs2encode
			*	@param {int[]} array   8byte int[]
			*	@return {string} output   utf8String
			*	@since 0.0.1
			*	@sync
			*	@static
			*	@demo utf8.html {utf测试}
			*	@example
					var Utf8 = require("latte_lib").utf8;
					console.log(Utf8.ucs2encode([108,97,116,116,101,30340,19990,30028])) ;//"latte的世界"
			*/
			var ucs2encode = this.ucs2encode = function(array) {
				var length = array.length;
				var index = -1;
				var value;
				var output = '';
				while (++index < length) {
					value = array[index];
					if (value > 0xFFFF) {
						value -= 0x10000;
						output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
						value = 0xDC00 | value & 0x3FF;
					}
					output += stringFromCharCode(value);
				}
				return output;
			}
			/**
			*	@method ucs2decode
			*	@param {string} str    utf8String
			*	@return {int[]} output   8byte int[]
			*	@since 0.0.1
			*	@sync
			*	@static
			*	@example
					var Utf8 = require("latte_lib").utf8;
					console.log(Utf8.ucs2decode("latte的世界")) ;//[108,97,116,116,101,30340,19990,30028]
			*/
			var ucs2decode = this.ucs2decode = function (string) {
				var output = [];
				var counter = 0;
				var length = string.length;
				var value;
				var extra;
				while (counter < length) {
					value = string.charCodeAt(counter++);
					if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
						// high surrogate, and there is a next character
						extra = string.charCodeAt(counter++);
						if ((extra & 0xFC00) == 0xDC00) { // low surrogate
							output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
						} else {
							// unmatched surrogate; only append this code unit, in case the next
							// code unit is the high surrogate of a surrogate pair
							output.push(value);
							counter--;
						}
					} else {
						output.push(value);
					}
				}
				return output;
			}
			function createByte(codePoint, shift) {
				return stringFromCharCode(((codePoint >> shift) & 0x3F) | 0x80);
			}

			function encodeCodePoint(codePoint) {
				if ((codePoint & 0xFFFFFF80) == 0) { // 1-byte sequence
					return stringFromCharCode(codePoint);
				}
				var symbol = '';
				if ((codePoint & 0xFFFFF800) == 0) { // 2-byte sequence
					symbol = stringFromCharCode(((codePoint >> 6) & 0x1F) | 0xC0);
				}
				else if ((codePoint & 0xFFFF0000) == 0) { // 3-byte sequence
					symbol = stringFromCharCode(((codePoint >> 12) & 0x0F) | 0xE0);
					symbol += createByte(codePoint, 6);
				}
				else if ((codePoint & 0xFFE00000) == 0) { // 4-byte sequence
					symbol = stringFromCharCode(((codePoint >> 18) & 0x07) | 0xF0);
					symbol += createByte(codePoint, 12);
					symbol += createByte(codePoint, 6);
				}
				symbol += stringFromCharCode((codePoint & 0x3F) | 0x80);
				return symbol;
			}
			/**
			*
			*	@method encode
			*	@param {string}  str   utf8string
			*	@return {string} byteString
			*	@since 0.0.1
			*   @static
			*	@sync
			*	@example
					var Utf8 = require("latte_lib").utf8;
					log(Utf8.encode("latte的世界")) ;//latteçä¸ç
			*
			*/
			var utf8encode = this.encode =  function(str) {
				var codePoints = ucs2decode(str);
				// console.log(JSON.stringify(codePoints.map(function(x) {
				// 	return 'U+' + x.toString(16).toUpperCase();
				// })));

				var length = codePoints.length;
				var index = -1;
				var codePoint;
				var byteString = '';
				while (++index < length) {
					codePoint = codePoints[index];
					byteString += encodeCodePoint(codePoint);
				}
				return byteString;
			}


			function readContinuationByte() {
				if (byteIndex >= byteCount) {
					throw Error('Invalid byte index');
				}

				var continuationByte = byteArray[byteIndex] & 0xFF;
				byteIndex++;

				if ((continuationByte & 0xC0) == 0x80) {
					return continuationByte & 0x3F;
				}

				// If we end up here, it’s not a continuation byte
				throw Error('Invalid continuation byte');
			}

			function decodeSymbol() {
				var byte1;
				var byte2;
				var byte3;
				var byte4;
				var codePoint;

				if (byteIndex > byteCount) {
					throw Error('Invalid byte index');
				}

				if (byteIndex == byteCount) {
					return false;
				}

				// Read first byte
				byte1 = byteArray[byteIndex] & 0xFF;
				byteIndex++;

				// 1-byte sequence (no continuation bytes)
				if ((byte1 & 0x80) == 0) {
					return byte1;
				}

				// 2-byte sequence
				if ((byte1 & 0xE0) == 0xC0) {
					var byte2 = readContinuationByte();
					codePoint = ((byte1 & 0x1F) << 6) | byte2;
					if (codePoint >= 0x80) {
						return codePoint;
					} else {
						throw Error('Invalid continuation byte');
					}
				}

				// 3-byte sequence (may include unpaired surrogates)
				if ((byte1 & 0xF0) == 0xE0) {
					byte2 = readContinuationByte();
					byte3 = readContinuationByte();
					codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
					if (codePoint >= 0x0800) {
						return codePoint;
					} else {
						throw Error('Invalid continuation byte');
					}
				}

				// 4-byte sequence
				if ((byte1 & 0xF8) == 0xF0) {
					byte2 = readContinuationByte();
					byte3 = readContinuationByte();
					byte4 = readContinuationByte();
					codePoint = ((byte1 & 0x0F) << 0x12) | (byte2 << 0x0C) |
						(byte3 << 0x06) | byte4;
					if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
						return codePoint;
					}
				}

				throw Error('Invalid UTF-8 detected');
			}

			var byteArray;
			var byteCount;
			var byteIndex;
			/**
			*	@method decode
			*	@sync
			*	@static
			*	@param {string}  byteString   bytes
			*	@return {string}
			*	@since 0.0.1
			*	@example
			*		var Utf8;
			*
			*		var Utf8 = require("latte_lib").utf8;
			*
			*
			*		console.log(Utf8.decode("latteçä¸ç")) ; //latte的世界
			*/
			var utf8decode = this.decode = function(byteString) {
				byteArray = ucs2decode(byteString);
				byteCount = byteArray.length;
				byteIndex = 0;
				var codePoints = [];
				var tmp;
				while ((tmp = decodeSymbol()) !== false) {
					codePoints.push(tmp);
				}
				return ucs2encode(codePoints);
			}



			// private method for UTF-8 encoding
			var _utf8_encode = function (string) {
					string = string.replace(/\r\n/g,"\n");
					var utftext = "";
					for (var n = 0; n < string.length; n++) {
							var c = string.charCodeAt(n);
							if (c < 128) {
									utftext += String.fromCharCode(c);
							} else if((c > 127) && (c < 2048)) {
									utftext += String.fromCharCode((c >> 6) | 192);
									utftext += String.fromCharCode((c & 63) | 128);
							} else {
									utftext += String.fromCharCode((c >> 12) | 224);
									utftext += String.fromCharCode(((c >> 6) & 63) | 128);
									utftext += String.fromCharCode((c & 63) | 128);
							}

					}
					return utftext;
			}

			// private method for UTF-8 decoding
			var _utf8_decode = function (utftext) {
					var string = "";
					var i = 0;
					var c = c1 = c2 = 0;
					while ( i < utftext.length ) {
							c = utftext.charCodeAt(i);
							if (c < 128) {
									string += String.fromCharCode(c);
									i++;
							} else if((c > 191) && (c < 224)) {
									c2 = utftext.charCodeAt(i+1);
									string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
									i += 2;
							} else {
									c2 = utftext.charCodeAt(i+1);
									c3 = utftext.charCodeAt(i+2);
									string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
									i += 3;
							}
					}
					return string;
			}
		}).call(module.exports);
	
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/debug.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

			
			var getLocation = function(str) {
				var at = str.toString().split("\n")[2];
				var data = at.substring(at.indexOf("(")+1, at.indexOf(")"));
				return data;
			}
		var latte_lib = require("./lib.js");	
		var disabled = latte_lib.isWindow? !window.debug: process.argv.indexOf("-debug") == -1;
		var loggers = {};
		var logger = {};
		["log", "info", "error","warn"].forEach(function(type) {
			logger[type] = function() {
				if(disabled) {
					return;
				}
				var debug = new Error("debug");
				console[type].apply( console[type], [ getLocation(debug.stack)].concat( Array.prototype.slice.call(arguments)));
			}
		});
		module.exports = logger;


});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/events.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

		var events;
		var latte_lib = require("./lib.js");
		if( latte_lib.isWindow) {
			/**
				@class events
				@namespace latte_lib
				@module basic
			*/
			var events = function() {
				this._events = this._events || {};
			};
			(events.interface = function() {
				/**
					@method on
					@public
					@param {String} event
					@param {Function} fn
					@return {events} this
					@example

						var Events = require("latte_lib").events;
						var events = new Events();
						events.on("hello", function() {
							log("latte");
						});
						events.emit("hello");
				*/
				this.on = this.addEventListener = function(event , fn) {
					this._events = this._events || {};
					(this._events[event] = this._events[event] || [])
						.push(fn);
					return this;
				};
				/**
					@method once
					@public
					@param {String} event
					@param {Function} fn
					@return {EventEmitter} this
					@example

						var Events = require("latte_lib").events;
						var events = new Events();
						events.once("hello", function() {
							log("latte");
						});
						events.emit("hello");
						events.emit("hello");
				*/
				this.once = function(event, fn) {
					var self = this;
					this._events = this._events || {};

					function on() {
						self.off(event, on);
						fn.apply(this, arguments);
					}

					on.fn = fn;
					this.on(event, on);
					return this;
				};
				/**
					@method off
					@public
					@param {String} event
					@param {Function} fn
					@return {EventEmitter} this
					@example

						var Events = require("latte_lib").events;
						var events = new Events();
						var fun = function() {
							log("latte");
						};
						events.once("hello", fun);
						events.emit("hello", fun);
				*/
				this.off =
				this.removeListener =
				this.removeAllListeners =
				this.removeEventListener = function(event, fn){
				  this._events = this._events || {};

				  // all
				  if (0 == arguments.length) {
				    this._events = {};
				    return this;
				  }

				  // specific event
				  var callbacks = this._events[event];
				  if (!callbacks) return this;

				  // remove all handlers
				  if (1 == arguments.length) {
				    delete this._events[event];
				    return this;
				  }

				  // remove specific handler
				  var cb;
				  for (var i = 0; i < callbacks.length; i++) {
				    cb = callbacks[i];
				    if (cb === fn || cb.fn === fn) {
				      callbacks.splice(i, 1);
				      break;
				    }
				  }
				  return this;
				};
				/**
					@method emit
					@public
					@param {String} event
					@return {EventEmitter} this
					@example

						var Events = require("latte_lib").events;
						var events = new Events();
						var fun = function() {
							log("latte");
						};
						events.on("hello", fun);
						event.emit("hello")
				*/
				this.emit = function(event){
					this._events = this._events || {};
					var args = [].slice.call(arguments, 1)
					, callbacks = this._events[event];
					if (callbacks) {
						callbacks = callbacks.slice(0);
						for (var i = 0, len = callbacks.length; i < len; ++i) {
						  callbacks[i].apply(this, args);
						}
					}

					return this;
				};
				/**
					@method listeners
					@public
					@param {String} event
					@return {Function[]}
					@example

						var Events = require("latte_lib").events;
						var events = new Events();
						var fun = function() {
							log("latte");
						};
						log(events.listeners("hello"));
				*/
				this.listeners = function(event){
					this._events = this._events || {};
					return this._events[event] || [];
				};
				/**
					@method hasListeners
					@public
					@param {String} event
					@return {Bool}
					@example

						var Events = require("latte_lib").events;
						var events = new Events();
						var fun = function() {
							log("latte");
						};
						log(events.hasListeners("hello"));
				*/
				this.hasListeners = function(event){
					return !! this.listeners(event).length;
				};
				this.hasEvent = function(event, func) {
					return this.listeners(event).indexOf(func) != -1;
				}
			}).call(events.prototype);
		}else{
			events = require("events").EventEmitter;
		}
		module.exports = events;
	
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/format.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

		var latte_lib = require("./lib.js");
		/**
			@namespace latte_lib
			@class format
			@module basic
		*/
		(function() {
			var _self = this;
			/**
					@property ISO8601_FORMAT
					@type String
			*/
			this.ISO8601_FORMAT = "yyyy-MM-dd hh:mm:ss.SSS";
			/**
				@property ISO8601_WITH_TZ_OFFSET_FORMAT
				@type String
			*/
			this.ISO8601_WITH_TZ_OFFSET_FORMAT = "yyyy-MM-ddThh:mm:ssO";
			/**
				@property DATETIME_FORMAT
				@type String
			*/
			this.DATETIME_FORMAT = "hh:mm:ss.SSS";
				function padWithZeros(vNumber, width) {
					var numAsString =  vNumber + "";
					while(numAsString.length < width) {
						numAsString = "0" + numAsString;
					}
					return numAsString;
				}
				function addZero(vNumber) {
					return padWithZeros(vNumber, 2);
				}
				function offset(date) {
					var os = Math.abs(date.getTimezoneOffset());
					var h = String(Math.floor(os/60));
					var m = String(os%60);
					if(h.length == 1) {
						h = "0" + h;
					}
					if(m.length == 1) {
						m = "0" + m;
					}
					return date.getTimezoneOffset() < 0 ? "+" + h + m : "-" + h + m;
				}
				/**
					@method getDateReplace
					@public
					@static
					@sync
					@param {Date} date
					@return {Object}
					@example
						var Format = require("latte_lib").format;
						var date = new Date();
						log(Format.getDateReplace(date));
				*/
				this.getDateReplace = function(date, prefix, postfix) {
					prefix = prefix ||  "";
					postfix = postfix || "";
					var vDay = addZero(date.getDate());
					var vMonth = addZero(date.getMonth() + 1);
					var vYearLong = addZero(date.getFullYear());
					var vYearShort = addZero(date.getFullYear().toString().substring(2,4));
					//var vYear = (format.indexOf("yyyy") > -1 ? vYearLong: vYearShort);
					var vHour = addZero(date.getHours());
					var vMinute = addZero(date.getMinutes());
					var vSecond = addZero(date.getSeconds());
					var vMillisecond = padWithZeros(date.getMilliseconds(), 3);
					var vTimeZone = offset(date);

					var result = {};
					result[prefix + "dd" + postfix] = vDay;
					result[prefix + "MM" + postfix] = vMonth;
					result[prefix + "yyyy" + postfix] = vYearLong;
					result[prefix + "y{1,4}" + postfix] = vYearShort;
					result[prefix + "hh" + postfix] = vHour;
					result[prefix + "mm" + postfix] = vMinute;
					result[prefix + "ss" + postfix] = vSecond;
					result[prefix + "SSS" + postfix] = vMillisecond;
					result[prefix + "O" + postfix] = vTimeZone;
					return result;
				}
				/**
					@method dateFormat
					@public
					@static
					@sync
					@param {String} format
					@param {Date} date
					@return {String} formatted
					@example
						var Format = require("latte_lib").format;
						var date = new Date();
						log(Format.dateFormat(Format.ISO8601_FORMAT, date));
				*/
			this.dateFormat = function(format, date, prefix, postfix) {
				if(!date) {
					date = format || new Date();
					format = exports.ISO8601_FORMAT;
				}
				var formatted = format;
				var json = _self.getDateReplace(date, prefix, postfix);
				latte_lib.jsonForEach(json, function(key, value) {
					formatted = formatted.replace(new RegExp(key,"g"), value);
				});
				return formatted;
			}
				var repeatStr = function(str, times) {
					var newStr = [];
					if(times > 0) {
						for(var i = 0; i < times; i++) {
							newStr.push(str);
						}
					}
					return newStr.join("");
				}
				var objFormat = function(object, level, jsonUti, isInArray) {
					var tab = isInArray ? repeatStr(jsonUti.t, level - 1): "";
					if(object === null || object === undefined) {
						return tab + "null";
					}
					switch(latte_lib.getClassName(object)) {
						case "array":
							var paddingTab = repeatStr(jsonUti.t , level - 1);
							var temp = [ jsonUti.n + paddingTab + "[" + jsonUti.n];
							var tempArrValue = [];
							for(var i = 0 , len = object.length; i < len; i++ ) {
								tempArrValue.push(objFormat(object[i], level + 1, jsonUti, true));
							}
							temp.push(tempArrValue.join("," + jsonUti.n));
							temp.push(jsonUti.n + paddingTab + "] ");
							return temp.join("");
						break;
						case "object":
							var currentObjStrings = [];
							for(var key in object) {
								if(object[key] == undefined) {
									continue;
								}
								var temp = [];
								var paddingTab = repeatStr(jsonUti.t, level);
								temp.push(paddingTab);
								temp.push("\"" + key +"\" : ");
								var value = object[key];
								temp.push(objFormat(value, level + 1, jsonUti));
								currentObjStrings.push(temp.join(""));
							}
							return (level > 1 && !isInArray ? jsonUti.n : "")
								+ repeatStr(jsonUti.t, level - 1) + "{" + jsonUti.n
								+ currentObjStrings.join("," + jsonUti.n)
								+ jsonUti.n + repeatStr(jsonUti.t , level - 1) + "}";
						break;
						case "number":
							return tab + object.toString();
						break;
						case "boolean":
							return tab + object.toString().toLowerCase();
						break;
						case "function":
							return object.toString();
						break;
						default:
							return tab + ("\"" + object.toString() + "\"");
						break;
					}
				}
			/**
				@method jsonFormat
				@public
				@static
				@param {Object}
				@param {Object} default { n: "\n", t: "\t"}
				@return {String}
				@example
					var Format = require("latte_lib").format;
					log(Format.jsonFormat({
						a: "1",
						b: 2,
						c: [3],
						d: {
							e: 4
					}
				}));

			*/
				var defaultUti = { n: "\n", t: "\t"};
			this.jsonFormat = function(object, jsonUti) {
				jsonUti = latte_lib.merger(defaultUti, jsonUti);
				try {
					return objFormat(object, 1, jsonUti);
				}catch(e) {
					throw object;
					return JSON.stringify(object);
				}
			}
			/**
			 * @method templateStringFormat
				 @sync
				 @public
				 @param {String} template
				 @param  {Object} options
				 @return {String} data
				 @example
						var Format = require("latte_lib").format;
						log(Format.templateStringFormat("hello, {{name}}", { name: "latte"}));
			 */
			this.templateStringFormat = function(template, options) {
				var data = template;
				for(var i in options) {
					data = data.replace(new RegExp("{{"+i+"}}","igm"), options[i]);
				}
				return data;
			}
			this.templateJsonFormat = function(template, options) {
						var template = JSON.stringify(template);
						var data = _self.templateStringFormat(template, options);
						return JSON.parse(data);
			}
		}).call(module.exports);
  
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/index.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

      /**
        @main
      */
      module.exports = require("./lib.js");
      (function() {
        if(!this.isWindow) {
          this.fs = require("./old/fs");
        }
        this.utf8 = require("./coding/utf8");
        this.async = require("./async");
        this.events = require("./events");
        this.format = require("./format");
        this.removeIdle = require("./old/removeIdle");
        this.queue = require("./old/queue");
        this.base64 = require("./coding/base64");
        this.debug = require("./debug");
        this.xhr = require("./old/xhr");
        this.object = require("./object");
        this.reconnection = require("./old/reconnection");
        this.co = require("./co");
        
      }).call(module.exports);
  
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/lib.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

		/**
		*	@namespace latte_lib
		*	@class lib
			@module basic
		*
		*/
		(function() {
			this.isWindow = (function() {
				try {
					if(window) {
						return true;
					}
				}catch(e) {
					return false;
				}
				try {
					if(process) {
						return false;
					}
				}catch(e) {
					return true;
				}
				

				return false;
			})();
			var _self = this;
				function getFunctionName(func) {
				    if ( typeof func == 'function' || typeof func == 'object' ) {
				        var name = ('' + func).match(/function\s*([\w\$]*)\s*\(/);
				    }
				    return name && name[1];
				}
				_self.trace = console.trace || function trace (count) {        
					var caller = arguments.callee.caller;        
					var i = 0;        
					count = count || 10;        
					console.log("***----------------------------------------  ** " + (i + 1));        
					while (caller && i < count) {
					    console.log(caller.toString());
					    caller = caller.caller;            
					    i++;            
					    console.log("***----------------------------------------  ** " + (i + 1));        
					}    
				}
			
			/**
			*	@method nextTick
			*	@param {function} callback
			*	@async
			*	@static
			*	@all
			*	@example
					(function() {
						require("latte_lib").nextTick(function(){
							console.log("a");
						});
						console.log("b");
					})();
					//b
					//a
			*/
			this.setImmediate = this.nextTick = (function() {
				if(typeof process === "undefined" || !(process.nextTick)) {
	                if(window && typeof window.setImmediate === "function") {
	                    return window.setImmediate;
	                }else {
	                    return function(fn) {
	                        setTimeout(fn, 0);
	                    }
	                }
	            } else {
	                return process.nextTick;
	            }
			})();
			/**
			*
			*	@method inherits
			*	@param {class} ctor     class
			*	@param {class} superCtor    parentClass
			*	@sync
			*	@all
			*	@static
			*	@public
			*	@since 0.0.1
			*	@example
					var latte_lib = require("latte_lib");
					var A = function() {
						this.name = "a";
					};
					(function() {
						this.getName = function() {
							return this.name;
						}
					}).call(A.prototype);
					var B = function() {
						this.name = "b";
					}
					latte_lib.inherits(B, A);
					var b = new B();
					var a = new A();
					log(b.getName());//"b"
					log(a.getName());//"a";
			*/
			this.inherits = function(ctor, superCtor) {
				if(typeof Object.create === "function") {
	                ctor.super_ = superCtor
	                ctor.prototype = Object.create(superCtor.prototype, {
	                  constructor: {
	                    value: ctor,
	                    enumerable: false,
	                    writable: true,
	                    configurable: true
	                  }
	                });
	            } else {
	                ctor.super_ = superCtor
	                var TempCtor = function () {}
	                TempCtor.prototype = superCtor.prototype
	                ctor.prototype = new TempCtor()
	                ctor.prototype.constructor = ctor
	            }
	            if(arguments.length > 2) {
	            	var args = Array.prototype.slice.call(arguments, 2);
	            	args.forEach(function(arg) {
	            		for(var key in arg) {
	            			ctor.prototype[key] = arg[key];
	            		}
	            	});
	            }
			}
			/**
			*	@method forEach
			*	@static
			* 	@sync
			*	@all
			*	@since 0.0.1
			*	@public
			*	@param {class} ctor     class
			*	@param {class} superCtor    parentClass
			*	@example
					var latte_lib = require("latte_lib");
					var array = [1,2,3,4];
					var all = 0;
					latte_lib.forEach(array, function(key) {
							all += key;
					});
					log(all);//20
			*/
			this.forEach = function(arr, iterator) {
				if(arr.forEach) {
					return arr.forEach(iterator);
				}
				for(var i = 0 ,len = arr.length; i < len; i++) {
					iterator(arr[i], i, arr);
				}
			}
			/**
			*	@method keys
			*	@static
			*	@sync
			*	@all
			*	@since 0.0.1
			*	@public
			*	@param   {object} obj
			*	@return  {string[]} stringArray
			*	@example
					var latte_lib = require("latte_lib");
					var obj = { a: "a", b: "b"};
					var keys = latte_lib.keys(obj);
					log(keys);//["a","b"]
			*/
			this.keys = function(obj) {
				if(Object.keys) {
					return Object.keys(obj);
				}
				var keys = [];
				for(var k in obj) {
					if(obj.hasOwnProperty(k)) {
						keys.push(k);
					}
				}
				return keys;
			}

			/**
			* 	@method copyArray
			* 	@static
			*	@param {array} arr
			*	@return {array}
			*	@sync
			*	@public
			*	@since 0.0.1
			*
			*	@example
					var latte_lib = require("latte_lib");
					var array = ["1", "a"];
					var cArray = latte_lib.copyArray(array);
					log(cArray);//["1", "a"]
			*/
			this.copyArray = function(arr) {
				return arr.concat([]);
			}

			/**
			* 	@method indexOf
			* 	@static
			*	@param {object[] || string} arr
			*	@param {object}  obj
			*	@return {int}
			*	@sync
			*	@public
			*	@since 0.0.1
			*
			*	@example
					var latte_lib = require("latte_lib");
					var array = ["1", "a"];
					var cArray = latte_lib.indexOf(array, "1");
					log(cArray);//0
			*/
			this.indexOf = function(arr, obj) {
				if(arr.indexOf) return arr.indexOf(obj);
				for(var i = 0, len = arr.length; i < len; i++) {
					if(arr[i] === obj) return i;
				}
				return -1;
			}
			/**
				@method removeArray
				@static
				@param {object[]} 	arr
				@param {int}   start      0 start
				@param {int}	end
				@public
				@since 0.0.1
				@sync
				@return {object[]}  as
				@example

					var latte_lib = require("latte_lib");
					var arr = [1,2,3,4,5];
					var as = latte_lib.removeArray(arr, 2,3);
					log(as);//[1,2,5]
					log(arr);//[1,2,3,4,5]
			*/
			this.removeArray = function(arr, start, end) {
				var as = _self.copyArray(arr);
				_self.removeLocalArray(as, start, end);
				return as;
			}

			/**
			* 	@method removeLocalArray
			* 	@static
			*	@param {object[]} arr
			*	@param {int} start
			*	@param {int} end
			*	@public
			*	@since 0.0.1
			*	@sync
			*	@return {object[]} arr
				@example
					var latte_lib = require("latte_lib");
					var arr = [1,2,3,4,5];
					var as = latte_lib.removeLocalArray(arr, 2,3);
					log(as);//[1,2,5]
					log(arr);//[1,2,5]
			*/
			this.removeLocalArray = function(arr, start, end) {
				/**
					var rest = array.slice((end || start)+1);
					array.length = start < 0? array.length + start : start;
					return array;
				*/
				end = end || start;
				arr.splice(start , end - start+1);
				return arr;
			}
			/**
				@method inserLocalArray
				@static
				@public
				@sync
				@since 0.0.1
				@param {object[]} arr
				@param {int} index
				@param {object} obj
				@return {object[]} arr
				@example

					var latte_lib = require("latte_lib");
					var arr = [1,2,3,4,5];
					var as = latte_lib.inserLocalArray(arr, 2, 9);
					log(as);//[1,2,9,3,4,5]
					log(arr);//[1,2,9,3,4,5]
			*/
			this.inserLocalArray = function(arr, index, obj) {
				/*
					var rest = [node].concat(array.slice(index));
					array.length = index < 0? array.length + index: index;
					array.push.apply(array, rest);
					return array;
				*/
				arr.splice(index , 0 , obj);
				return arr;
			}

			/**
				@method copy
				@static
				@public
				@sync
				@since 0.0.1
				@param {object} obj
				@return {object} obj
				@example

					var latte_lib = require("latte_lib");
					var copy = latte_lib.copy({
						a: function() {

						},
						b: "1"
					});
					console.log(copy);
					//{ b : "1" }
			*/
			this.copy = function(obj) {
				return JSON.parse(JSON.stringify(obj));
			}
			/**
				@method clone
				@static
				@public
				@sync
				@since 0.0.1
				@param {object} obj
				@return {object} obj
				@example

					var latte_lib = require("latte_lib");
					var o = {
						a: function() {

						},
						b: "1"
					};
					var clone = latte_lib.clone(o);
					o.b = "2";
					console.log(clone);//{ a: function(){}, b: "1"}
					console.log(o);    //{ a: function(){}, b: "2"}
			*/
			this.clone = function(obj) {
				var o ;
				if(_self.isArray(obj)) {
					o = [];
				}else{
					o = {};
				}
				for(var i in obj) {
					if(obj.hasOwnProperty(i)) {
						o[i] = obj[i];
					}
				}
				return o;
			}
			/**
				@method reduce
				@static
				@public
				@sync
				@since 0.0.1
				@param {object[]} arr
				@param {function} iterator
				@param {obj}  memo
				@return {obj} memo
				@example

					var latte_lib = require("latte_lib");
					var array = [1,2,3,4];
					var c = 0;
					var d = latte_lib.reduce(array, function(c, x, i, a) {
						return c + x;
					}, c);
					log(d);//10;
					log(c);//0;

			*/
			this.reduce = function(arr, iterator, memo) {
				if(arr.reduce) {
					return arr.reduce(iterator, memo);
				}
				_self.forEach(arr, function(x, i, a) {
					memo = iterator(memo, x, i, a);
				});
				return memo;
			}

			/**
				@method map
				@static
				@public
				@sync
				@param {object[]} arr
				@param {function} iterator
				@return {object[]} results;
				@since 0.0.1
				@example

					var latte_lib = require("latte_lib");
					var arr = [1,2,3,4];
					var as = latte_lib.map(arr, function(o) {
						return o+1;
					});
					log(as);//[2,3,4,5]
			*/
			this.map = function(arr, iterator) {
				if(arr.map) {
					return arr.map(iterator);
				}
				var results = [];
				_self.forEach(arr, function(x, i, a) {
					results.push(iterator(x, i, a));
				});
				return results;
			}
			/**
				@method jsonForEach
				@param {json} data
				@param {function} iterator
				@static
				@public
				@example
					var latte_lib = require("latte_lib");
					var data = {
						a: 1,
						b: "c",
						c: [1,2,3]
					};
					latte_lib.jsonForEach(data, function(key, value) {
						log(key, value);
					});
					//a   1
					//b   c
					//c   [1,2,3]
			*/
			this.jsonForEach = function(data, iterator) {
				this.keys(data).forEach(function(key) {
					iterator(key, data[key]);
				});
			}
			/**
				@method getChar
				@param {string} str
				@param {int} index
				@return  {string}
				@sync
				@public
				@static
				@example

					var latte_lib = require("latte_lib");
					var str = "abcde";
					var char = latte_lib.getChar(str, 1);
					log(char);//b
			*/
			this.getChar = function(str, index) {
				var strs = str.split("");
				return strs[index];
			}
			if(!Function.prototype.bind) {
				Function.prototype.bind = function(thisArg) {
					var args = Array.prototype.slice.call(arguments, 1);
					var self = this;
					return function() {
						self.apply(thisArg, args.concat(Array.prototype.slice.call(arguments)));
					}
				}
			}
			this.isObject = function(obj) {
				if(!obj) { return false; }
				return obj.constructor == Object;
			}
			/**
				@method	isArray
				@public
				@static
				@sync
				@param {objct}  obj
				@return {bool}
				@example

					var latte_lib = require("latte_lib");
					log( latte_lib.isArray(1) ); //false
					log( latte_lib.isArray([1,2,3]) ); //true
			*/
			this.isArray = function(obj) {
				if(Array.isArray) {
					return Array.isArray(obj);
				}else{
					throw "no handle isArray";
				}
			};

			/**
				@method isDate
				@static
				@public
				@sync
				@param {objct}  obj
				@return {bool}
				@example

					var latte_lib = require("latte_lib");
					log( latte_lib.isDate(1) ); //false
					var date = new Date();
					log( latte_lib.isDate(date) );	//true
			*/
			this.isDate = function(obj) {
				return obj.constructor == Date;
			};



			["String", "Function", "Boolean", "Number"].forEach(function(className) {
				_self["is"+className] = function(obj) {
	        		return typeof(obj) == className.toLowerCase();
	        	}
			});

			this.isPromise = function(obj) {
				return _self.isFunction(obj.then);
			}

			this.getClassName = function(obj) {
				if(!obj) {
					return undefined;
				}
				var allClass = ["Array", "String", "Number", "Date", "Boolean","Function"];
				for(var i = 0, len = allClass.length; i < len; i++) {
					if(_self["is"+allClass[i]](obj)) {
						return allClass[i].toLowerCase();
					}
				}
				return "object";
			}


			/**
				@method merger
				@sync
				@static
				@public
				@param {object} master
				@param {...object} arguments{1, -1}
				@return {object} master
				@example

					var latte_lib = require("latte_lib");
					var a = latte_lib.merger({
						a: 1
					}, {
						b: 2
					});
					log(a);// {a: 1, b: 2}
			*/
			this.merger = function(master) {
				var master = _self.clone(master);
				Array.prototype.slice.call(arguments, 1).forEach(function(child) {
					if(!child) { return; }
					Object.keys(child).forEach(function(key) {
						master[key] = child[key];
					});
				});
				return master;
			}
			this.getErrorString = function(err) {
				if(err.stack) {
					return err.stack.toString();
				}else if(latte_lib.isString(err)) {
					return err.toString();
				}else{
						var errorString;
						try {
								errorString = JSON.stringify(err);
						}catch(e){
								var Util = require("util");
								errorString = Util.inspect(err);
						}
						return errorString;
				}
			}
			this.defineProperties = Object.defineProperties || function(obj, properties) {
				function convertToDescriptor(desc)
				  {
				    function hasProperty(obj, prop)
				    {
				      return Object.prototype.hasOwnProperty.call(obj, prop);
				    }

				    function isCallable(v)
				    {
				      // 如果除函数以外,还有其他类型的值也可以被调用,则可以修改下面的语句
				      return typeof v === "function";
				    }

				    if (typeof desc !== "object" || desc === null)
				      throw new TypeError("不是正规的对象");

				    var d = {};
				    if (hasProperty(desc, "enumerable"))
				      d.enumerable = !!obj.enumerable;
				    if (hasProperty(desc, "configurable"))
				      d.configurable = !!obj.configurable;
				    if (hasProperty(desc, "value"))
				      d.value = obj.value;
				    if (hasProperty(desc, "writable"))
				      d.writable = !!desc.writable;
				    if (hasProperty(desc, "get"))
				    {
				      var g = desc.get;
				      if (!isCallable(g) && g !== "undefined")
				        throw new TypeError("bad get");
				      d.get = g;
				    }
				    if (hasProperty(desc, "set"))
				    {
				      var s = desc.set;
				      if (!isCallable(s) && s !== "undefined")
				        throw new TypeError("bad set");
				      d.set = s;
				    }

				    if (("get" in d || "set" in d) && ("value" in d || "writable" in d))
				      throw new TypeError("identity-confused descriptor");

				    return d;
				  }

				  if (typeof obj !== "object" || obj === null)
				    throw new TypeError("不是正规的对象");

				  properties = Object(properties);
				  var keys = Object.keys(properties);
				  var descs = [];
				  for (var i = 0; i < keys.length; i++)
				    descs.push([keys[i], convertToDescriptor(properties[keys[i]])]);
				  for (var i = 0; i < descs.length; i++)
				    Object.defineProperty(obj, descs[i][0], descs[i][1]);

				  return obj;
			};
			/**
				Object.defineProperty(obj, prop, descriptor)

				obj
				需要定义属性的对象。
				prop
				需被定义或修改的属性名。
				descriptor
				需被定义或修改的属性的描述符。


				该方法允许精确添加或修改对象的属性。一般情况下，我们为对象添加属性是通过赋值来创建并显示在属性枚举中（for...in 或 Object.keys 方法）， 但这种方式添加的属性值可以被改变，也可以被删除。而使用 Object.defineProperty() 则允许改变这些额外细节的默认设置。例如，默认情况下，使用  Object.defineProperty() 增加的属性值是不可改变的。

				对象里目前存在的属性描述符有两种主要形式：数据描述符和存取描述符。数据描述符是一个拥有可写或不可写值的属性。存取描述符是由一对 getter-setter 函数功能来描述的属性。描述符必须是两种形式之一；不能同时是两者。

				数据描述符和存取描述符均具有以下可选键值：

				configurable
				当且仅当该属性的 configurable 为 true 时，该属性才能够被改变，也能够被删除。默认为 false。
				enumerable
				当且仅当该属性的 enumerable 为 true 时，该属性才能够出现在对象的枚举属性中。默认为 false。
				数据描述符同时具有以下可选键值：

				value
				该属性对应的值。可以是任何有效的 JavaScript 值（数值，对象，函数等）。默认为 undefined。
				writable
				当且仅当仅当该属性的writable为 true 时，该属性才能被赋值运算符改变。默认为 false。
				存取描述符同时具有以下可选键值：

				get
				一个给属性提供 getter 的方法，如果没有 getter 则为 undefined。该方法返回值被用作属性值。默认为undefined。
				set
				一个给属性提供 setter 的方法，如果没有 setter 则为 undefined。该方法将接受唯一参数，并将该参数的新值分配给该属性。默认为undefined。
				记住，这些选项不一定是自身属性，如果是继承来的也要考虑。为了确认保留这些默认值，你可能要在这之前冻结Object.prototype，明确指定所有的选项，或者将__proto__属性指向null。
			
				//https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
			*/
			
		}).call(module.exports);
	
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/number/float.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
(function() {
	/**
		@class Number
		@method add
		@param a {String Or Int}
		@return Number;
		浮点数加法
	*/
	this.add = function(a, b) {
		var r1,r2,m;
		try{
			r1 = a.toString().split(".")[1].length
		}catch(e) {
			console.log("Number method add arg[0] is ",a);
			r1 = 0;
		}
		try{
			r2 = b.toString().split(".")[1].length
		}catch(e) {
			console.log("Number method add arg[1] is ",b);
			r2 = 0;
		}
		m=Math.pow(10,Math.max(r1,r2))
    	return (arg1*m+arg2*m)/m
	}
	/**
		@class Number
		@method add
		@param a {String Or Int}
		@return Number;
		浮点数减法
	*/
	this.sub = function(a, b) {
		return self.add(a, -b);
	}
	/**
		@class Number
		@method add
		@param a {String Or Int}
		@return Number;
		浮点数乘法
	*/
	this.mul = function(a, b) {
		var m=0,s1=a.toString(),s2=b.toString();
    	try{ m+=s1.split(".")[1].length }catch(e){}
    	try{ m+=s2.split(".")[1].length }catch(e){}
    	return Number(s1.replace(".",""))*Number(s2.replace(".",""))/Math.pow(10,m)
	}
	/**
		@class Number
		@method add
		@param a {String Or Int}
		@return Number;
		浮点数除法
	*/
	this.div = function(a, b) {
		try{t1=a.toString().split(".")[1].length}catch(e){}
    	try{t2=b.toString().split(".")[1].length}catch(e){}
   
        	r1=Number(a.toString().replace(".",""))
        	r2=Number(b.toString().replace(".",""))
        	return (r1/r2)*Math.pow(10,t2-t1);
    	

	}
}).call(Number.prototype);
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/object.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
	var latte_lib = require("./lib.js")
		, events = require("./events.js");

	var LatteObject = function(data) {
		var self = this;
		this.childEvents = {};
		self.data = {};
			var addEvent = function(key, value) {
				self.childEvents[key] = function(name, value, oldValue) {
					self.emit(key+"."+name, value, oldValue, data);
					self.emit("change", key+"."+name, value, oldValue, data);
				};
				value.on("change", self.childEvents[key]);
			};
			var removeEvent = function(key, value) {
				if(LatteObject.isLatteObject(value)) {
					value.off("change", self.childEvents[key]);
					delete self.childEvents[key];
				}
			};
		(function init() {
			for(var i in data) {
				var l = LatteObject.create(data[i]);
				if(l) {
					addEvent(i, l);
					self.data[i] = l;
				}else{
					self.data[i] = data[i];
				}
			}
			
		})();


		var set = function (key, value, mode) {
			if(!latte_lib.isArray(key)) {
				key = key.toString().split(".");
			}
			if(key.length == 1) {
				var k = key[0];
				var ov = self.data[k];
				var od = data[k];
				var nv;
				switch(mode) {
					case 1:
					break;
					default:
						removeEvent(k, ov);
						var nv = LatteObject.create(value);
						if(nv) {
							addEvent(k, nv);
						}else{
							nv = value;
						}
						self.data[k] = nv;
						data[k] = value;
						return {
							ov: ov,
							nv: nv
						};
					break;
				}
			}else{
				var k = key.pop();
				return self.get(key).set(k, value, mode);
			}
		}
		this._set = set;
		this.merge = function(value) {
			for(var i in value) {
				self.set(i, value[i]);
			}
		}
		this.set = function(key, value, mode) {

			var result = set(key, value);
			
			if(key.indexOf(".") == -1) {
				self.emit("change", key, result.nv, result.ov);
			}
			
			self.emit(key, result.nv, result.ov);
			
			return result;
		}

		this.get = function(key) {
			if(key == "this" &&  !self.data[key]) {
				return self;
			}
			if(!latte_lib.isArray(key)) {
				key = key.toString().split(".");
			}
			
			var v = self;
			if(key.length == 1) {
				return self.data[key[0]];
			}else{
				var k = key.shift();
				return self.data[k].get(key);
			}
		}

		this.toJSON = function() {
			return data;
		}
		
		this.getKeys = function() {
			return Object.keys(self.data);
		}
	};
	(function() {
		this.isLatteArray= function(data) {
			var LatteArray = require("./array");
			return data.constructor == LatteArray;
		};
		this.isLatteObject = function(data) {
			var LatteArray = require("./array");
			return data && (
				data.constructor == LatteObject || 
				data.constructor == require("./array")
			);
		};
		this.getType = function(data) {
			if(LatteObject.isLatteObject(data)) {
				return "LatteObject";
			}
			if(Array.isArray(data)) {
				return "Array";
			}
			if(data && data.constructor == Object) {
				return "Object";
			}
		};

		this.create = function(data) {
			var LatteArray = require("./array");
			switch(LatteObject.getType(data)) {
				case "LatteObject":
					return data;
				break;
				case "Array":
					return new LatteArray(data);
				break;
				case "Object":
					return new LatteObject(data);
				break;
				default:
					return null;
				break;
			}
		};
		
		this.equal = function(a, b) {
			if(a == null && b == null) {
				return true;
			}
			if( (a == null && b!= null)  || (a != null && b == null)) {
				return false;
			}
			//console.log(a, b);
			if(a.constructor != b.constructor) {
				return false;
			}
			if(latte_lib.isArray(a) ){
				if(a.length != b.length) {
					return false;
				}
				for(var i =0 ,len = a.length; i < len; i++) {
					if(!equal(a[i], b[i])) {
						return false;
					}
				}
				return true;
			}
			if(LatteObject.isLatteArray(a) ) {
				if(a.length != b.length) {
					return false;
				}
				for(var i =0 ,len = a.length; i < len; i++) {
					if(!equal(a.get(i), b.get(i))) {
						return false;
					}
				}
				return true;
			}
			if(LatteObject.isLatteObject(a)) {
				return a.toJSON() == b.toJSON();
			}
			return a == b;
		};
	}).call(LatteObject);
	latte_lib.inherits(LatteObject, events);
	module.exports = LatteObject;
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/object_.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
	var latte_lib = require("./lib.js")
		, events = require("./events.js");
	var LatteArray = function(data) {
		var self = this;
		this.data = [];

		var doEvent = function(name, value, oldValue) {
			var index = self.data.indexOf(this);
			self.emit(index + "." + name, value, oldValue, data);
			self.emit("change", index + "." + name, value, oldValue, data);
		}
		data.forEach(function(o, i) {
			var n = LatteObject.create(o);
			if(n) {
				n.on("change", doEvent);
				//console.log("equ",doEvent.bind(n) == doEvent.bind(n));
				self.data[i] = n;
			}else{
				self.data[i] = o;
			}
		});
		var set = function(key, value) {
			if(!latte_lib.isArray(key)) {
				key = key.toString().split(".");
			}
			if(key.length == 1) {
				var k = key[0];
				var ov = self.data[k];
				var nv;
				if(LatteObject.isLatteArray(value)) {
					if(!LatteObject.isLatteObject(ov)) {
						ov.off("change", doEvent);
						self.data[k] = value;
						data[k] = value.toJSON();
					}else if(LatteObject.isLatteArray(ov)) {
						var okeys = ov.getKeys()
							, nkeys = value.getKeys();
						var separateData = separate(okeys, nkeys);
						separateData.oa.forEach(function(ok) {
							self.data[k].set(ok, null);
						});
						nkeys.forEach(function(ok) {
							self.data[k].set(ok, value.get(ok));
						});
					}else{
						self.data[k] = value;
						data[k] = value.toJSON();
					}
				}else if(LatteObject.isLatteObject(value)) {

					if(!LatteObject.isLatteObject(ov)) {
						//ov.off("change", self.childEvents[key]);
						self.data[k] = value;
						data[k] = value.toJSON();
					}else if(LatteObject.isLatteArray(ov)) {
						ov.off("change",doEvent);
						self.data[k] = value;
						data[k] = value.toJSON();

					}else{
						var oks = ov.getKeys()
							, vks = value.getKeys();
						var separateData = separate(okeys, nkeys);
						separateData.oa.forEach(function(ok) {
							self.data[k].set(ok, null);
						});
						nkeys.forEach(function(ok) {
							self.data[k].set(ok, value.get(ok));
						});
						

					}
				}else if(latte_lib.isObject(value)){
					var add = function() {
							var o = LatteObject.create(value);
						
							self.data[k] = o;
							data[k] = value;
							o.on('change', doEvent);
						}
					if(!LatteObject.isLatteObject(ov) ) {
						add();
					}else if(LatteObject.isLatteArray(ov)){
						ov.off("change", doEvent);
						add();
					}else{
						//object -> object
						var nkeys = Object.keys(value);
						var okeys = Object.keys(data[k]);
						var separateData = separate(okeys, nkeys);
						separateData.oa.forEach(function(ok) {
							self.data[k].set(ok, null);
						});
						nkeys.forEach(function(ok) {
							self.data[k].set(ok, value[ok]);
						});
					}
							
				}else if(latte_lib.isArray(value)){
						var add = function() {
							var o = LatteObject.create(value);
					
							o.on('change', doEvent);
							self.data[k] = o;
							data[k] = value;
						}
					if(!LatteObject.isLatteObject(ov) ) {
						add();
					}else if(LatteObject.isLatteArray(ov)){
						var nkeys = Object.keys(value);
						var okeys = Object.keys(data[k]);
						var separateData = separate(okeys, nkeys);
						separateData.oa.forEach(function(ok) {
							self.data[k].set(ok, null);
						});
						nkeys.forEach(function(ok) {
							self.data[k].set(ok, value[ok]);
						});
					}else{
						ov.off("change", doEvent);
						add();
					}
				}else{
					if(LatteObject.isLatteObject(ov)) {
						ov.off("change", doEvent);
					}
					nv = value;
					self.data[k] = value; 
					data[k] = value;
				}	
				return {
					ov: ov, 
					nv: nv
				}
			}else{
				var k = key.shift();
				return self.get(k).set(key, value);
			}
			//data[key] = value;

		}
		var set_ = function(key, value) {

			data[key] = value;
			var ov = self.data[key];
			var nv ;
			if(LatteObject.isLatteObject(ov)) {
				console.log(ov._events);
			}
				nv = LatteObject.create(value);
				if(nv) {
					nv.on("change", doEvent);
					/**
					self.data[key] = nv;
					nv.getKeys().forEach(function(k) {

						self.emit(key+"."+k, nv.get(k));
					});
					*/

				}else{
					self.data[ key] = nv = value;					
				}
			return {
				ov: ov,
				nv: nv
			};
		}
		
		this.get = function(key) {
			if(key == "this" &&  !self.data[key]) {
				return self.data;
			}
			if(!latte_lib.isArray(key)) {
				key = key.toString().split(".");
			}
			
			var v = self;
			if(key.length == 1) {
				return self.data[key[0]];
			}else{
				var k = key.shift();
				return self.data[k].get(key);
			}
			//return self.data[key];
		}
		this._set = set;
		this.set = function(key, value) {
			var data = set(key, value);
			self.emit("set", key, data.nv, data.ov);
			self.emit("change", key, data.nv, data.ov);
			return data;
		}
		this.push = function(o) {
			var key = self.data.length;
			var data = set(key, o);
			self.emit("push", key, data.nv);
			self.emit("change", key, data.nv);
		}
		this.pop = function() {
			var data = set(self.length - 1, null);
			self.data.pop();
			self.emit("pop",  data.ov);
			self.emit("change", self.length, null, data.ov);
		}


		this.shift = function() {
			var old = self.data.shift();
			old.off("change", doEvent);
			self.emit("shift", old);

			for(var i = 0, len = self.data.length; i < len; i++) {
				self.emit("change", i, self.data[i]);
			}
			self.emit("change", self.data.length, null);
		}
		this.unshift = function() {
			var args = Array.prototype.map.call(arguments, function(value) {
				var o = LatteObject.create(value);
				if(o) {
					o.on("change", doEvent);
				}
				return o || value;
			});
			self.data.unshift.apply(self.data, args);
			self.emit.apply(self, ["unshift"].concat(args));

			for(var i = 0, len = self.data.length; i < len; i++) {
				self.emit("change", i, self.data[i]);
			}
		}

		this.splice = function(startIndex, num) {
			var oLength = self.data.length;
			var adds = Array.prototype.splice.call(arguments, 2);
			var addOs = adds.map(function(o) {
				var n = LatteObject.create(o);
				if(n) {
					n.on("change", doEvent);
				}
				return n || o;
			});

			self.data.splice.apply(self.data, [startIndex, num].concat(addOs));
			console.log(["splice",startIndex, num].concat(addOs));
			self.emit.apply(self,  ["splice", startIndex, num].concat(addOs));
			
			for(var i = 0, len = Math.max(oLength, self.data.length); i < len; i++) {
				self.emit("change", i, self.data[i]);
			}
		} 

		this.toJSON = function() {
			return data;
		}


		//this.concat 不改变原来数组的
		this.indexOf = function(data) {
			return self.data.indexOf(data);
		}
		this.forEach = function(callback) {
			self.data.forEach(callback);
		};

		this.map = function(callback) {
			return self.data.map(callback);
		}

		Object.defineProperty(self, "length", {
			get: function() {
				return self.data.length;
			},
			set: function(value) {
				throw new Error("暂时没处理")
			}
		});


		this.getKeys = function() {
			return Object.keys(self.data);
		}
		/**
		this.emitPartner = function(key, partner, old) {
			this.getKeys().forEach(function(k) {	
				if(LatteObject.isLatteObject( self.get(k))) {
					self.get(k).emitPartner(key + "."+k, partner);
				}else{
					partner.emit(key + "." + k, self.get(k), old.get(key + "." + k));
				}
			});
		}
		*/

	};
	latte_lib.inherits(LatteArray, events);
	(function() {
		
	}).call(LatteArray.prototype);
		
		var separate = function(o, n) {
			var oa = []
				, na = latte_lib.copy(n)
				, sa = [];
			o.forEach(function(i, index) {
				var ni = na.indexOf(i);
				if(ni != -1) {
					na.splice(ni, 1);
					sa.push(i);
				}else{
					oa.push(i);
				}
			});
			return  {
				oa: oa,
				na: na,
				sa: sa
			};

		}
	var LatteObject = function(data) {

		
			var self = this;
			this.childEvents = {};
			self.data = {};
			for(var i in data) {	
				//		
				var l = LatteObject.create(data[i]);
				if(l) {
					self.childEvents[i] = function(name, value, oldValue) {
						self.emit(i+"."+name, value, oldValue, data);
						self.emit("change", i+"."+name, value, oldValue, data);
					};
					l.on("change", self.childEvents[i]);	
					self.data[i] = l;
				}else{
					self.data[i] = data[i];
				}		
			}
				
				var set =  function(key, value) {
					if(!latte_lib.isArray(key)) {
						key = key.toString().split(".");
					}
					var k = key[0];
					if(key.length == 1) {
						var ov = self.data[k];
						var od = data[k];
						var nv;
						if(LatteObject.isLatteArray(value)) {
							if(!LatteObject.isLatteObject(ov)) {
								ov.off("change", self.childEvents[key]);
								self.data[k] = value;
								data[k] = value.toJSON();
							}else if(LatteObject.isLatteArray(ov)) {
								var okeys = ov.getKeys()
									, nkeys = value.getKeys();
								var separateData = separate(okeys, nkeys);
								separateData.oa.forEach(function(ok) {
									self.data[k].set(ok, null);
								});
								nkeys.forEach(function(ok) {
									self.data[k].set(ok, value.get(ok));
								});
							}else{
								self.data[k] = value;
								data[k] = value.toJSON();
							}
						}else if(LatteObject.isLatteObject(value)) {
							
							if(!LatteObject.isLatteObject(ov)) {
								//ov.off("change", self.childEvents[key]);
								self.data[k] = value;
								data[k] = value.toJSON();
							}else if(LatteObject.isLatteArray(ov)) {
								ov.off("change", self.childEvents[key]);
								self.data[k] = value;
								data[k] = value.toJSON();
							}else{
								var oks = ov.getKeys()
									, vks = value.getKeys();
								var separateData = separate(okeys, nkeys);
								separateData.oa.forEach(function(ok) {
									self.data[k].set(ok, null);
								});
								nkeys.forEach(function(ok) {
									self.data[k].set(ok, value.get(ok));
								});
								

							}
						}else if(latte_lib.isObject(value)){
						
								var add = function() {
									var o = LatteObject.create(value);
									
									self.childEvents[k] = function(name, value, oldValue) {
										self.emit(k + "." + name, value, oldValue, data);
										self.emit("change", k+"."+name, value, oldValue, data);
									}
									o.on('change', self.childEvents[k]);
									self.data[k] = o;
									data[k] = value;
								}
							if(!LatteObject.isLatteObject(ov) ) {
								add();
							}else if(LatteObject.isLatteArray(ov)){
								ov.off("change", self.childEvents[key]);
								add();
							}else{
								//object -> object
								var nkeys = Object.keys(value);
								var okeys = Object.keys(data[k]);
								var separateData = separate(okeys, nkeys);
								separateData.oa.forEach(function(ok) {
									self.data[k].set(ok, null);
								});
								nkeys.forEach(function(ok) {
									self.data[k].set(ok, value[ok]);
								});
							}
							
							
						}else if(latte_lib.isArray(value)){
								var add = function() {
									var o = LatteObject.create(value);
									
									self.childEvents[k] = function(name, value, oldValue) {
										self.emit(k + "." + name, value, oldValue, data);
										self.emit("change", k+"."+name, value, oldValue, data);
									}
									o.on('change', self.childEvents[k]);
									self.data[k] = o;
									data[k] = value;
								}
							if(!LatteObject.isLatteObject(ov) ) {
								add();
							}else if(LatteObject.isLatteArray(ov)){
								var nkeys = Object.keys(value);
								var okeys = Object.keys(data[k]);
								var separateData = separate(okeys, nkeys);
								separateData.oa.forEach(function(ok) {
									self.data[k].set(ok, null);
								});
								nkeys.forEach(function(ok) {
									self.data[k].set(ok, value[ok]);
								});
							}else{
								ov.off("change", self.childEvents[key]);
								add();
							}
						
						}else{
							if(LatteObject.isLatteObject(ov)) {
								ov.off("change", self.childEvents[key]);
							}
							nv = value;
							if(value == null) {
								delete self.data[key[0]];
								delete data[key[0]];
							}else{
								self.data[ key[0]] = value;
								data[key[0]] = value; 
							}
							
						};	
						
						return {
							ov: ov, 
							nv: nv
						};
					}else{
						var k = key.shift();
						return self.get(k).set(key, value);
					}
						//data[key] = value;					
				}
					this._set = set;
					this.set = function(key, value) {
						
						var data = set(key, value);
						self.emit(key, data.nv, data.ov);
						self.emit("change", key, data.nv, data.ov);
						return data;
					}
				this._set_ = function(key, value) {
					data[key] = value;
					var oldValue = self.data[key];
					if(LatteObject.isLatteObject(oldValue)) {
						self.data[key].off("change", self.childEvents[key]);
					}
					var nowValue = LatteObject.create(value);
					
					if(nowValue) {
						self.childEvents[key] = function(name, value, oldValue) {
							self.emit(i + "." + name, value, oldValue, self.data[key]);
							self.emit("change", i + "." + name, value, oldValue, self.data[key]);
						}
						nowValue.on("change", self.childEvents[key]);
						self.data[key] = nowValue;												
					}else{						
						nowValue = value;	
						self.data[key] = value;					
					}
					return {
						ov: oldValue,
						nv: nowValue
					};
				}
				this.get = function(key) {
					if(key == "this" &&  !self.data[key]) {
						return self.data;
					}
					if(!latte_lib.isArray(key)) {
						key = key.toString().split(".");
					}
					
					var v = self;
					if(key.length == 1) {
						return self.data[key[0]];
					}else{
						var k = key.shift();
						return self.data[k].get(key);
					}
					//return self.data[key];
				}

				this.toJSON = function() {
					return data;
				}
				
				this.getKeys = function() {
					return Object.keys(self.data);
				}
				
		
	};
	latte_lib.inherits(LatteObject, events);
	(function() {
		
	}).call(LatteObject.prototype);
	(function() {
		this.isLatteArray= function(data) {
			return data.constructor == LatteArray;
		}
		this.isLatteObject = function(data) {
			return data && (
				data.constructor == LatteObject || 
				data.constructor == LatteArray
			);
		}
		this.getType = function(data) {
			if(LatteObject.isLatteObject(data)) {
				return "LatteObject";
			}
			if(Array.isArray(data)) {
				return "Array";
			}
			if(data && data.constructor == Object) {
				return "Object";
			}
		}
		this.create = function(data) {
			switch(LatteObject.getType(data)) {
				case "LatteObject":
					return data;
				break;
				case "Array":
					return new LatteArray(data);
				break;
				case "Object":
					return new LatteObject(data);
				break;
				default:
					return null;
				break;
			}
			
		}
	}).call(LatteObject);
	module.exports = LatteObject;
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/old/blobBuilder.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

		var view = window;
		view.URL = view.URL || view.webkitURL;
		// if (view.Blob && view.URL) {
		// 	try {
		// 		new Blob;
		// 		return;
		// 	} catch (e) {}
		// }

		// Internally we use a BlobBuilder implementation to base Blob off of
		// in order to support older browsers that only have BlobBuilder
		var BlobBuilder = view.BlobBuilder || view.WebKitBlobBuilder || view.MozBlobBuilder || (function(view) {
			var
				  get_class = function(object) {
					return Object.prototype.toString.call(object).match(/^\[object\s(.*)\]$/)[1];
				}
				, FakeBlobBuilder = function BlobBuilder() {
					this.data = [];
				}
				, FakeBlob = function Blob(data, type, encoding) {
					this.data = data;
					this.size = data.length;
					this.type = type;
					this.encoding = encoding;
				}
				, FBB_proto = FakeBlobBuilder.prototype
				, FB_proto = FakeBlob.prototype
				, FileReaderSync = view.FileReaderSync
				, FileException = function(type) {
					this.code = this[this.name = type];
				}
				, file_ex_codes = (
					  "NOT_FOUND_ERR SECURITY_ERR ABORT_ERR NOT_READABLE_ERR ENCODING_ERR "
					+ "NO_MODIFICATION_ALLOWED_ERR INVALID_STATE_ERR SYNTAX_ERR"
				).split(" ")
				, file_ex_code = file_ex_codes.length
				, real_URL = view.URL || view.webkitURL || view
				, real_create_object_URL = real_URL.createObjectURL
				, real_revoke_object_URL = real_URL.revokeObjectURL
				, URL = real_URL
				, btoa = view.btoa
				, atob = view.atob

				, ArrayBuffer = view.ArrayBuffer
				, Uint8Array = view.Uint8Array

				, origin = /^[\w-]+:\/*\[?[\w\.:-]+\]?(?::[0-9]+)?/
			;
			FakeBlob.fake = FB_proto.fake = true;
			while (file_ex_code--) {
				FileException.prototype[file_ex_codes[file_ex_code]] = file_ex_code + 1;
			}
			// Polyfill URL
			if (!real_URL.createObjectURL) {
				URL = view.URL = function(uri) {
					var
						  uri_info = document.createElementNS("http://www.w3.org/1999/xhtml", "a")
						, uri_origin
					;
					uri_info.href = uri;
					if (!("origin" in uri_info)) {
						if (uri_info.protocol.toLowerCase() === "data:") {
							uri_info.origin = null;
						} else {
							uri_origin = uri.match(origin);
							uri_info.origin = uri_origin && uri_origin[1];
						}
					}
					return uri_info;
				};
			}
			URL.createObjectURL = function(blob) {
				var
					  type = blob.type
					, data_URI_header
				;
				if (type === null) {
					type = "application/octet-stream";
				}
				if (blob instanceof FakeBlob) {
					data_URI_header = "data:" + type;
					if (blob.encoding === "base64") {
						return data_URI_header + ";base64," + blob.data;
					} else if (blob.encoding === "URI") {
						return data_URI_header + "," + decodeURIComponent(blob.data);
					} if (btoa) {
						return data_URI_header + ";base64," + btoa(blob.data);
					} else {
						return data_URI_header + "," + encodeURIComponent(blob.data);
					}
				} else if (real_create_object_URL) {
					return real_create_object_URL.call(real_URL, blob);
				}
			};
			URL.revokeObjectURL = function(object_URL) {
				if (object_URL.substring(0, 5) !== "data:" && real_revoke_object_URL) {
					real_revoke_object_URL.call(real_URL, object_URL);
				}
			};
			FBB_proto.append = function(data/*, endings*/) {
				var bb = this.data;
				// decode data to a binary string
				if (Uint8Array && (data instanceof ArrayBuffer || data instanceof Uint8Array)) {
					var
						  str = ""
						, buf = new Uint8Array(data)
						, i = 0
						, buf_len = buf.length
					;
					for (; i < buf_len; i++) {
						str += String.fromCharCode(buf[i]);
					}
					bb.push(str);
				} else if (get_class(data) === "Blob" || get_class(data) === "File") {
					if (FileReaderSync) {
						var fr = new FileReaderSync;
						bb.push(fr.readAsBinaryString(data));
					} else {
						// async FileReader won't work as BlobBuilder is sync
						throw new FileException("NOT_READABLE_ERR");
					}
				} else if (data instanceof FakeBlob) {
					if (data.encoding === "base64" && atob) {
						bb.push(atob(data.data));
					} else if (data.encoding === "URI") {
						bb.push(decodeURIComponent(data.data));
					} else if (data.encoding === "raw") {
						bb.push(data.data);
					}
				} else {
					if (typeof data !== "string") {
						data += ""; // convert unsupported types to strings
					}
					// decode UTF-16 to binary string
					bb.push(unescape(encodeURIComponent(data)));
				}
			};
			FBB_proto.getBlob = function(type) {
				if (!arguments.length) {
					type = null;
				}
				return new FakeBlob(this.data.join(""), type, "raw");
			};
			FBB_proto.toString = function() {
				return "[object BlobBuilder]";
			};
			FB_proto.slice = function(start, end, type) {
				var args = arguments.length;
				if (args < 3) {
					type = null;
				}
				return new FakeBlob(
					  this.data.slice(start, args > 1 ? end : this.data.length)
					, type
					, this.encoding
				);
			};
			FB_proto.toString = function() {
				return "[object Blob]";
			};
			FB_proto.close = function() {
				this.size = 0;
				delete this.data;
			};
			return FakeBlobBuilder;
		}(view));

		view.Blob = function(blobParts, options) {
			var type = options ? (options.type || "") : "";
			var builder = new BlobBuilder();
			if (blobParts) {
				for (var i = 0, len = blobParts.length; i < len; i++) {
					builder.append(blobParts[i]);
				}
			}
			return builder.getBlob(type);
		};
		module.exports = BlobBuilder;
	
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/old/buffer.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

		if(window) {
			var utf8 = require("../coding/utf8");	

			var BufferPrototype = function() {
				function checkOffset(offset, ext, length) {
				  if ((offset % 1) !== 0 || offset < 0)
				    throw new RangeError('offset is not uint');
				  if (offset + ext > length)
				    throw new RangeError('Trying to access beyond buffer length');
				}
				function checkInt(buffer, value, offset, ext, max, min) {
				  if ((value % 1) !== 0 || value > max || value < min)
				    throw TypeError('value is out of bounds');
				  if ((offset % 1) !== 0 || offset < 0)
				    throw TypeError('offset is not uint');
				  if (offset + ext > buffer.length || buffer.length + offset < 0)
				    throw RangeError('Trying to write outside buffer length');
				}
				this.slice = function(start, end) {
					var array  = Array.prototype.slice.call(this, start, end);
					return new Buffer(array);
				};
				this.readInt32LE = function(offset, noAssert) {
					if (!noAssert)
	    				checkOffset(offset, 4, this.length);
					return (this[offset]) | 
					(this[offset + 1] << 8) |
					(this[offset + 2] << 16) |
					(this[offset + 3] << 24);
				}
				this.readInt16LE = function(offset, noAssert) {
					if (!noAssert)
	    				checkOffset(offset, 2, this.length);
					var val = this[offset] | (this[offset + 1] << 8);
					return (val & 0x8000)? val | 0xFFFF0000 : val;
				}
				this.writeInt32LE = function(value, offset, noAssert) {
					if (!noAssert)
	   					checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
					this[offset] = value;
					this[offset + 1] = (value >>> 8);
					this[offset + 2] = (value >>> 16);
					this[offset + 3] = (value >>> 24);
				}
				this.writeInt16LE = function(value, offset, noAssert) {	
					if (!noAssert)
	   					checkInt(this, value, offset, 2, 0x7fff, -0x8000);		
					this[offset] = value;
					this[offset + 1] = (value >>> 8);
				}
				this.copy = function(buff, start, meStart, meEnd) {
					var meStart = meStart || 0
						, meEnd = meEnd || this.length;
					for(var i = 0,len = meEnd - meStart; i <= len; i++) {
						buff[start + i] = this[meStart + i];
					}
				}
				this.toString = function(encoding, start, end ) {
					switch(encoding) {
						/*case "base64":
						
						break;*/
						default: 
						var string = utf8.ucs2encode(this);
						return string;
					}
					
				}
			};
			var  Buffer = function(data) {		
				var data = new Uint8Array(data);
				BufferPrototype.call(data);
				return data;
			};
			(function() {
				this.create = function(data) {
					if(typeof data === "string") {
						var data = utf8.ucs2decode(data);	
						var buffer = new Buffer(data.length);
						data.forEach(function(object, index) {
							buffer[index] = object;
						});
						return  buffer;
					}
				}
			}).call(Buffer);
			module.exports = Buffer;
		}else{
			module.exports = Buffer;
		}
		
	
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/old/fs.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

      var Fs = require("fs")
        , Path = require("path");
        /**
          @class fs
          @namespace latte_lib
          @module old
        */
      (function() {
        var self = this;
    		for(var i in Fs) {
    			self[i] = Fs[i]
    		};
        this.exists = function(path, callback) {
          return Fs.exists(path, callback);
        }
        /**
        *  @method existsSync
        *  @static
        *  @public
        *  @sync
        *  @param {String} path 文件地址字符串
        *  @return {Bool}  exists   是否存在   存在为true；不存在为false
        *  @nodejs
          @example

            //@nodejs
            var Fs  = require("latte_lib");
            var exists = Fs.existsSync("./test.js");
            log(exists);
        */
        this.existsSync = function(path) {
          return Fs.existsSync(path);
        }
        /**
        *  @method mkdirSync
        *  @static
        *  @public
        *  @sync
        *  @param {String} path
        *  @param {Object} options
        *  @return {Error} error
        *  @nodejs
           @example
              //nodejs


        */
        this.mkdirSync = function(path, options) {
            if( self.existsSync(path)) {
              return null;
            }
            if(!self.existsSync(Path.dirname(path))) {
              var error = self.mkdirSync(Path.dirname(path), options);
              if(error) { return error; }
            }
            return Fs.mkdirSync(path, options);
        }
        /**
        *  @method writeFileSync
        *  @static
        *  @public
        *  @sync
        *  @param {String} path
        *  @param {String} data
        *  @return {Error} error
        *  @example
            //@nodejs

        */
        this.writeFileSync = function(path, data) {
          var error = self.mkdirSync(Path.dirname(path));
          if(error) { return error; }
          return Fs.writeFileSync(path, data, {encoding: "utf8"});
        }
        /**
          @method writeFile
          @static
          @public
          @sync
          @param {String} path
          @param {String} data
          @param {Function} callback
          @example
            //@nodejs
            var Fs = require("latte_lib").fs;
            Fs.writeFile("./test", test);
        */
        this.writeFile = function(path, data, callback) {
          self.mkdir(Path.dirname(path), null, function() {
  					Fs.writeFile(path, data, {encoding: "utf8"}, callback);
  				});
        }
        this.readFile = function(path, callback) {
          return Fs.readFile(path, function(err, buffer) {
              callback(err, buffer? buffer.toString(): null);
          });
        }
        this.readFileSync = function(path) {
          return Fs.readFileSync(path).toString();
        }
        this.mkdir = function(path, options, callback) {
          self.exists(path, function(exists) {
              if(exists) {
                callback(null, path);
              }else{
                self.mkdir(Path.dirname(path), options, function(err) {
                  if(err) { return callback(err); }
                  Fs.mkdir(path, options, callback);
                });
              }
          });
        }
        this.copyFile = function(fromPath, toPath, callback) {
          //@finding best function
          try {
            var from = Fs.createReadStream(fromPath);
            self.mkdir(Path.dirname(toPath), null, function(error) {
              var to = Fs.createWriteStream(toPath);
              from.pipe(to);
              callback(null);
            });
          }catch(e) {
            callback(e);
          }
        }

        this.copyDir = function(fromPath, toPath, callback) {

        }
        this.fileType = function(path) {
          return Path.extname(path).substring(1);
        }
        this.lstatSync = function(path) {
          return Fs.lstatSync(path);
        }
        this.readdirSync = function(path) {
          return Fs.readdirSync(path);
        }
        this.realpathSync = function(path, cache) {
          return Fs.realpathSync(path, cache);
        }
        this.appendFile = function(filename, data, options, callback) {
          return Fs.appendFile(filename, data, options, callback);
        }
        this.appendFileSync = function(filename, data, options) {
          return Fs.appendFile(filename, data, options);
        }
        /**
          @method deleteFileSync
          @static
          @sync
          @param {String} filename
          @param {Function} callback
          @example

            var Fs = require("latte_lib").fs;
            Fs.deleteFile("test", function(error) {
              console.log(error);
            });
        */
        this.deleteFile = function(filename, callback) {
          Fs.unlink(filename, callback);
        }
        /**
          @method deleteFileSync
          @static
          @sync
          @param {String} path
          @return {Error} error
          @example

            var Fs = require("latte_lib").fs;
            Fs.deleteFileSync("test");
        */
        this.deleteFileSync = function(path) {
            return Fs.unlinkSync(path);
        }
        this.stat = function(path, callback) {
            return Fs.stat(path, callback);
        }
        this.createReadStream = function(path, options) {
            return Fs.createReadStream(path, options);
        }
        this.createWriteStream = function(path, options) {
            var error = self.mkdirSync(Path.dirname(path));
            return Fs.createWriteStream(path, options);
        }

        this.rename = function(oldPath, newPath, callback) {
            return Fs.rename(oldPath, newPath, callback);
        }
        this.watch = function(filename, options, listener) {
            return Fs.watch(filename, options, listener);
        }
        this.statSync = function(filename) {
            return Fs.statSync(filename);
        }
        this.WriteStream = Fs.WriteStream;

        this.getTimeSort = function(dirName) {
          var files = Fs.readdirSync(dirName).map(function(o) {
            var stat = Fs.lstatSync(dirName+o);
            return {
              time: stat.ctime.getTime(),
              obj: dirName+o
            };
          });
          files.sort(function(a, b) {
            return a.time > b.time;
          });
          return files.map(function(o) {
            return o.obj;
          });
          
        }
      }).call(module.exports);
  
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/old/promise.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {


		(function() {
			this.defer = function() {
				var pending = [], value;
				return {
			        resolve: function (_value) {
			            if (pending) {
			                value = ref(_value);
			                for (var i = 0, ii = pending.length; i < ii; i++) {
			                    // XXX
			                    enqueue(function () {
			                        value.then.apply(value, pending[i]);
			                    });
			                }
			                pending = undefined;
			            }
			        },
			        promise: {
			            then: function (_callback, _errback) {
			                var result = defer();
			                _callback = _callback || function (value) {
			                    return value;
			                };
			                _errback = _errback || function (reason) {
			                    return reject(reason);
			                };
			                var callback = function (value) {
			                    result.resolve(_callback(value));
			                };
			                var errback = function (reason) {
			                    result.resolve(_errback(reason));
			                };
			                if (pending) {
			                    pending.push([callback, errback]);
			                } else {
			                    // XXX
			                    enqueue(function () {
			                        value.then(callback, errback);
			                    });
			                }
			                return result.promise;
			            }
			        }
			    };
			}

			this.ref = function(value) {
				if(value && value.then) {
					return value;
				}
				return {
					then: function(callback) {
						var result = defer();
						enqueue(function() {
							result.resolve(callback(value));
						});
						return result.promise;
					}
				};
			}
			this.reject = function(reason) {
				return {
					then: function(callback, errback) {
						var result = defer();
						enqueue(function() {
							result.resolve(errback(reason));
						});
						return result.promise;
					}
				}
			};
			this.when = function(value, _callback, _errback) {
				var result = defer();
				var done;
				_callback = _callback || function(value) {
					return value;
				}
				_errback = _errback || function(reason) {
					return reject(reason);
				}
				var callback = function(value) {
					try {
						return _callback(value);
					}catch(reason) {
						return reject(reason);
					}
				};
				var errback = function(reason) {
					try {
						return _errback(reason);
					} catch(reason) {
						return reject(reason);
					}
				};
				enqueue(function() {
					ref(value).then(function(value) {
						if(done) 
							return;
						done = true;
						result.resolve(ref(value).then(callback, errback));
					}, function(reason) {
						if(done) {
							return;
						}
						done = true;
						result.resolve(errback(reason));
					});
				});
				return result.promise;
			}
		}).call(module.exports);	
	
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/old/queue.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

		/**
			@module old
			@namespace latte_lib
			@class queue
		*/

		function Queue(size) {
			this._size = Math.max(+size | 0, 1);
			this.slots = [];
			for(var i = 0; i < this._size; i++) {
				this.slots.push([]);
			}
		}
		(function(){
			/**
				@method size
				@return {Int} total
				@sync
				@example

					var Queue =  require("latte_lib").queue;
					console.log(Queue);
					var queue = new Queue();
					log(queue.size()); //0
			*/
			this.size = function() {
				if(this.total == null) {
					this.total = 0;
					for(var i = 0 ; i< this._size; i++) {
						this.total += this.slots[i].length;
					}
				}
				return this.total;
			}
			/**
				@method enqueue
				@param {Object} obj
				@param {Int} priority
				@example
					var Queue = require("latte_lib").queue;
					var q = new Queue(2);
					q.enqueue("1", 0);
					q.enqueue("2", 1);
					q.enqueue("3",0);
					log(q.size());//3
					log(q.dequeue());//1
					log(q.dequeue());//3
					log(q.dequeue());//2
			*/
			this.enqueue = function(obj, priority) {
				var priorityOrig;
				priority = priority && +priority | 0 || 0;
				this.total = null;
				if(priority) {
					priorityOrig = priority;
					if(priority < 0 || priority >= this._size) {
						priority = (this._size -1);
					}
				}
				this.slots[priority].push(obj);
			}
			/**
				@method dequeue
				@return {Object} obj
				@example
					var Queue = require("latte_lib").queue;
					var q = new Queue();
					var one = q.dequeue();
					log(one); //null
					q.enqueue("1");
					var two = q.dequeue();
					log(two); // 1

			*/
			this.dequeue = function() {
				var obj = null, sl = this.slots.length;
				this.total = null;
				for(var i = 0; i < sl; i++) {
					if(this.slots[i].length > 0) {
						obj = this.slots[i].shift();
						break;
					}
				}
				return obj;
			}
		}).call(Queue.prototype);
		module.exports = Queue;
  
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/old/reconnection.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

		var latte_lib = require("../lib.js");
		function Reconnection(config) {
			this.attempts = 0;
			this.reconnecting = config.reconnecting || false;//是否在重连
			this.openReconnect = true;//是否开启重启
			this.readyState = "close";
			this.reconnectionDelay = config.reconnectionDelay || 2000;
			this.reconnectionDelayMax = config.reconnectionDelayMax || 60*1000;
			
		};
		(function(){
			this.maybeReconnectOnOpen = function() {
				/*if(!this.openReconnect && !this.reconnecting && this._reconnection && this.attempts === 0) {
					this.openReconnect = true;
					this.reconnect();
				}*/
				if(!this.reconnecting && this.readyState.indexOf("close") != -1 && this.openReconnect) {
					this.reconnect();
				}
			}

			this.cleanup = function() {}
			this.onReconnect = function() {
				var attempt = this.attempts;
				this.attempts = 0;
				this.reconnecting = false;
			}
			this.reconnect = function () {
				if(this.reconnecting) return this;
				if(!this.openReconnect) return this;
				var self = this;
				if(this.attemptsMax && ++this.attempts > this.attemptsMax) {
					this.reconnecting = false;
					console.log("reconnecting_fail full");
				} else {
					var delay = this.attempts * this.reconnectionDelay;
					delay = Math.min(delay, this.reconnectionDelayMax);
					this.reconnecting = true;
					var timer = setTimeout(function() {
						self.open(function(err) {
							if(err) {
								self.reconnecting = false;
								self.reconnect();
							}else {
								self.onReconnect();
							}
						});
					}, delay);
				}
			}
			this.onClose = function(reason) {
				this.cleanup();
				this.readyState = "closed";
				//this.emit("close", reason);
				if(this.openReconnect) {
					this.reconnect();
				}
			}
		}).call(Reconnection.prototype);
		module.exports = Reconnection;
	
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/old/removeIdle.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

		/**
			@module old
			@namespace latte_lib
			@class removeIdle
		*/
		function RemoveIdle(config) {
			this.reapIntervalMillis = config.reapIntervalMillis || 1000;
			this.idleTimeoutMillis = config.idleTimeoutMillis || 10000;
			this.refreshIdle = config.refreshIdle || true;
			this.returnToHead = config.returnToHead || false;
			this.scheduleRemoveIdle();
			this.min = config.min || 0;
			this.max = config.max || 1000;
			this.availableObjects = [];
			this._destroy = config.destroy || function() {};
			this._create = config.create;
			this.log = config.log || null;
		};
		(function() {
			/**
				forget the function 
			*/
			this.removeConditions = function() {	return true;}
			/**
				when clean a object after then do the function
				@interface

			*/
			this.ensureMinimum = function() {

			}
			/**
				when add a object after then do the function
				@interface

			*/
			this.dispense = function() {}
			/**
					@method getIdle
					@param {Object} obj
					@example
						var RemoveIdle = require("latte_lib").removeIdle;
						var r = new RemoveIdle({
									idleTimeoutMillis: 1000
						});
						var obj = "1";
						r.release(obj);
						log(r.size());//1
						r.getIdle(obj);
						log(r.size());//0


			*/
			this.getIdle = function(obj) {
				this.availableObjects = this.availableObjects.filter(function(objWithTimeout) {
					return (objWithTimeout.obj !== obj);
				});
			}
			/**
				@method size
				@return {Int}
				@example
					var RemoveIdle = require("latte_lib").removeIdle;
					var r = new RemoveIdle({
								idleTimeoutMillis: 1000
					});
					log(r.size());//0
			*/
			this.size = function() {
				return this.availableObjects.length;
			}
			/**
				@method update
				@param {Object} obj
				@example

					var RemoveIdle = require("latte_lib").removeIdle;
					var r = new RemoveIdle({
								idleTimeoutMillis: 1000
					});
					var obj = {
							timeout: Date.now()-1,
							obj: "1"
					};
					setTimeout(function(){

							r.availableObjects.push(obj);
							setTimeout(function() {
									log("one", r.size());//one,1
									r.update(obj.obj);
									r.removeIdle();
									log("two",r.size());//two,1
									setTimeout(function(){
												log("three", r.availableObjects.length);//three,0
									},1000);
							}, 2000);
					}, 2000);

			*/
			this.update = function(obj) {
				for(var i =0 , len = this.availableObjects.length; (i < len && this.removeConditions());i++) {
    				if(obj == this.availableObjects[i].obj) {
    					this.availableObjects[i].timeout = new Date().getTime() + this.idleTimeoutMillis;
    				}
    			}
			}
			/**
				add obj in availableObjects
				@method release
				@param {Object} obj
				@public
				@example
					var RemoveIdle = require("latte_lib").removeIdle;
					var r = new RemoveIdle({
						idleTimeoutMillis: 1000
					});
					r.release("1");
					log(r.size());//1
					setTimeout(function(){
						log(r.size());//0
					}, 1000);
			*/
			this.release = function(obj) {
				if(this.availableObjects.some(function(objWithTimeout) {
					if(objWithTimeout.obj === obj) {
						//续时
						objWithTimeout.timeout =  new Date().getTime() + this.idleTimeoutMillis;
						return true;
					}
				})) {
					this.log && this.log.error("called twice for the same resource")
					//刷新
					return;
				};
				var objWithTimeout = {obj: obj, timeout: (new Date().getTime() + this.idleTimeoutMillis)}
				if(this.returnToHead) {
					this.availableObjects.splice(0,0,objWithTimeout);
				} else{
					this.availableObjects.push(objWithTimeout);
				}
				this.dispense();
				this.scheduleRemoveIdle();
			}
			/**
				@method removeIdle
				@example

					var RemoveIdle = require("latte_lib").removeIdle;
					var r = new RemoveIdle({
								idleTimeoutMillis: 1000
					});
					//sleep 2000ms
					//when r.availableObjects.length == 0  then close autoClean;
					setTimeout(function(){
							r.availableObjects.push({
									timeout: Date.now()-1,
									obj: "1"
							});
							setTimeout(function() {
									log("one", r.size());//one,1
									r.removeIdle();
									log("two",r.size());//two,0
							}, 2000);
					}, 2000);

			*/
			this.removeIdle = function() {
				var toRemove = [],
    				now = new Date().getTime(),
    				self = this
    				timeout;
				this.removeIdleScheduled = false;
    			for(var i =0 , len = this.availableObjects.length; (i < len && this.removeConditions());i++) {
    				var timeout = this.availableObjects[i].timeout;
    				if(now > timeout) {
    					toRemove.push(this.availableObjects[i].obj);
    				}
    			}
    			for(var i = 0, len = toRemove.length; i < len; i++) {
    				self.destroy(toRemove[i]);
    			}
    			if(this.availableObjects.length > 0) {
    				this.scheduleRemoveIdle();
    			}
			}
			/**
				@method scheduledRemoveIdle
				@example
					var RemoveIdle = require("latte_lib").removeIdle;
					var r = new RemoveIdle({
								idleTimeoutMillis: 1000
					});
					setTimeout(function(){
							r.availableObjects.push({
									timeout: Date.now()-1,
									obj: "1"
							});
							setTimeout(function() {
									log("one", r.size());//one,1
									r.scheduleRemoveIdle();
									log("two",r.size());//two,1
									setTimeout(function(){
												log("three", r.size());//three,0
									},1000);
							}, 2000);
					}, 2000);
			*/
			this.scheduleRemoveIdle = function() {
				if (!this.removeIdleScheduled) {
					this.removeIdleScheduled = true;
					this.removeIdleTimer = setTimeout(this.removeIdle.bind(this), this.reapIntervalMillis);
		    }
			}
			/**
				@method destroy
				@param {Object} obj
				@example
					var RemoveIdle = require("latte_lib").removeIdle;
					var r = new RemoveIdle({
								idleTimeoutMillis: 1000
					});
					setTimeout(function(){
							r.availableObjects.push({
									timeout: Date.now()-1,
									obj: "1"
							});
							setTimeout(function() {
									log("one", r.size());//one,1
									r.destroy(r.availableObjects[0].obj);
									log("two",r.size());//two,1
							}, 2000);
					}, 2000);
			*/
			this.destroy = function(obj) {
				this.getIdle(obj);
				this._destroy(obj);
				this.ensureMinimum();
			}
			/**
				@method destroyAllNow
				@param {Function} callback
				@example
					var RemoveIdle = require("latte_lib").removeIdle;
					var r = new RemoveIdle({
								idleTimeoutMillis: 1000
					});

					r.availableObjects.push({
							timeout: Date.now()+ 60 * 60 * 1000,
							obj: "1"
					});
					setTimeout(function() {
							log("one", r.size());//one,1
							r.destroyAllNow();
							log("two",r.size());//two,0
					}, 2000);

			*/
			this.destroyAllNow = function(callback) {
				var willDie = this.availableObjects;
				this.availableObjects = [];
				var obj = willDie.shift();
				var self = this;
				while(obj !== null && obj !== undefined) {
					self.destroy(obj.obj);
					obj = willDie.shift();
				}
				this.removeIdleScheduled = false;
				clearTimeout(this.removeIdleTimer);
				if(callback) {
					callback();
				}
			}
		}).call(RemoveIdle.prototype);
		module.exports = RemoveIdle;
 
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_lib/old/xhr.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

      var lib = require("../lib")
          , events = require("../events")
          , empty = function() {}
          , Request
          , XMLHttpRequest;
      var defaultHeaders = {

      };
      if(lib.isWindow) {
          XMLHttpRequest = window.XMLHttpRequest;
          Request = function(opts) {
              this.method = opts.method || "GET";
              this.uri = opts.uri;
              this.data = opts.data;
              this.async = false != opts.async;

              this.xd = !!opts.xd;
              this.xs = !!opts.xs;
              this.agent = opts.agent;
              this.enablesXDR = opts.enablesXDR;

              this.pfx = opts.pfx;
              this.key = opts.key;
              this.passphrase = opts.passphrase;
              this.cert = opts.cert;
              this.ca = opts.ca;
              this.ciphers = opts.ciphers;
              this.rejectUnauthorized = opts.rejectUnauthorized;

              this.headers = lib.merger(defaultHeaders, opts.headers);
              this.create();
          }
          lib.inherits(Request, events);
          (function() {
              this.create = function() {
                  var xhr = this.xhr = new XMLHttpRequest({
                      agent: this.agent,
                      xdomain: this.xd,
                      xscheme: this.xs,
                      enablesXDR: this.enablesXDR,
                      pfx: this.pfx,
                      key: this.key,
                      passphrase: this.passphrase,
                      cert: this.cert,
                      ca: this.ca,
                      ciphers: this.ciphers,
                      rejectUnauthorized: this.rejectUnauthorized
                  });
                  var self = this;
                  try {
                     xhr.open(this.method, this.uri, this.async);
                     //if("withCredentials" in xhr) {
                        xhr.withCredentials = true;

                     //}
                     try {
                          if(this.headers) {
                              //xhr.setDisableHeaderCheck(true);
                              for(var i in this.headers) {
                                  if(this.headers.hasOwnProperty(i)) {
                                      xhr.setRequestHeader(i, this.headers[i]);
                                  }
                              }
                          }
                     }catch(e) {
                        console.log("setHeader error", e);
                     }
                    
                     if(this.hasXDR()) {
                        xhr.onload = function() {
                            self.onLoad();
                        }
                        xhr.onerror = function(err) {
                            console.log(err.stack.toString());
                            self.onError(err.stack.toString());
                        }
                     } else {
                         xhr.onerror = function(err) {
                            console.log(err);
                            self.onError(err);
                        }
                        xhr.onreadystatechange = function() {
                            if(4 != xhr.readyState) return;
                            if(200 == xhr.status || 1223 == xhr.status) {
                                self.onLoad();
                            }else{
                                //lib.nextTick(function(){
                                //    self.onError(xhr.status);
                                //});
                            }
                        }
                     }
                     xhr.send(this.data);
                  } catch(e) {
                      return lib.nextTick(function() {
                            self.onError(e);
                      });
                  }
                  if(Request.requests) {
                      this.index = Request.requests.requestsCount++;
                      Request.requests[this.index] = this;
                  }
              }

              this.onSuccess = function() {
                  this.emit("success");
                  this.cleanup();
              };

              this.onData = function(data) {
                  this.emit("data", data);
                  this.onSuccess();
              };

              this.onError = function(err) {
                  this.emit("error", err);
                  this.cleanup(true);
              }

              this.cleanup = function(fromError) {
                  if("undefined" == typeof this.xhr || null == this.xhr) {
                      return;
                  }
                  if(this.hasXDR()) {
                      this.xhr.onload = this.xhr.onerror = empty;
                  }else{
                      this.xhr.onreadystatechange = empty;
                  }
                  if(fromError) {
                      try {
                          this.xhr.abort();
                      }catch(e) {

                      }
                  }

                  if(Request.requests) {
                      delete Request.requests[this.index];
                  }
                  this.xhr = null;
              }

              this.onLoad = function() {
                  var data;
                  try {
                      var contentType;
                      try {
                          contentType = this.xhr.getResponseHeader("Content-Type");
                      }catch(e) {}
                      if(contentType == "application/octet-stream") {
                          data = this.xhr.response;
                      }else{
                          if(!this.supportsBinary) {
                              data = this.xhr.responseText;
                          } else {
                              var Buffer = require("./buffer");
                              data = String.fromCharCode.apply(null, new Buffer(this.xhr.response));
                          }
                      }
                  } catch(e) {
                      this.onError(e);
                  }
                  if( null != data) {
                      this.onData(data);
                  }
              }

              this.hasXDR = function() {
                  return (!window || "undefined" !== typeof window.XDomainRequest) && !this.xs && this.enablesXDR;
              }

              this.abort = function() {
                  this.cleanup();
              }
              if(window.attachEvent) {
                window.attachEvent("onunload", Request.unloadHandler);
              }else{
								window.addEventListener("beforeunload", Request.unloadHandler, false);
							}

          }).call(Request.prototype);
      }else{
        var URL = require("url");
        var Request = function(opts) {
            this.uri = opts.uri;
            this.method = opts.method || "GET";
            this.data = opts.data;
            this.encoding = opts.encoding ;
            this.headers = lib.merger(defaultHeaders, opts.headers);
            this.create();
        };
        lib.inherits(Request, events);
        (function() {
            this.create = function() {
                var self = this;
                var opts = URL.parse(this.uri);
                opts.method = this.method;
                //opts.pathname = encodeURIComponent(opts.pathname);
               
                var handleName = opts.protocol.substring(0,  opts.protocol.length -1) || "http";
                var handle = require(handleName);
								var Domain = require("domain");
								var domain = Domain.create();
								domain.on("error", function(err) {
										self.onError(err);
								});
								domain.run(function() {
                  //opts.
									var req = this.req = handle.request(opts, function(res) {
											if(res.statusCode != 200) {
													return self.onError(res.statusCode);
											}
											self.emit("headers", res.headers);
											if(self.encoding) {
                           res.setEncoding(self.encoding);
                      }
                     
											var data = "";
											res.on("data", function(chunk) {
													self.emit("chunk", chunk);
													data += chunk.toString();
											});
											res.on("end", function() {
													self.onData(data, res.headers);
											});
									});
									req.on("error", function(error) {
											self.onError(error);
									});
									req.end(self.data);
									if(Request.requests) {
											self.index = Request.requests.requestsCount++;
											Request.requests[self.index]  = self;
									}
								});

            }
            this.onError = function(error) {
                this.emit("error", error);
                this.cleanup(true);
            }
            this.onData = function(data, type) {
                this.emit("data", data, type);
                this.cleanup(false);
            }
            this.cleanup = function(fromError) {
                if("undefined" == typeof this.req || null == this.req) {
                    return;
                }
                this.onData = this.onError = empty;
                if(fromError) {
                    try {
                        this.req.abort();
                    }catch(e){}
                }
                if(Request.requests) {
                    delete Request.requests[this.index];
                }
                this.req = null;
            }
        }).call(Request.prototype);

      }
      (function() {
          this.requests = {};
          this.requestsCount = 0;
          var _self = this;
          this.unloadHandler = function() {
              for(var i in _self.requests) {
                  if(_self.requests.hasOwnProperty(i)) {
                      _self.requests[i].abort();
                  }
              }
          }
              var escape = function(str) {
                  return encodeURIComponent(str);
              }
              var stringifyPrimitive = function(v) {
									
                  switch(typeof v) {
                      case "string":
                      return v;
                      case "boolean":
                      return v? "true": "false";
                      case "number":
                      return isFinite(v)? v: "";
                      case "object":
                      return JSON.stringify(v);
                      default:
                      return "";
                  }
              }
              var urlencode = this.urlencode = function(obj, sep, eq) {
								sep = sep || "&";
								eq = eq || "=";
								if(obj === null) {
									obj = undefined;
								}
								if(typeof obj === "object") {
									return Object.keys(obj).map(function(k) {
										var ks = escape(stringifyPrimitive(k)) + eq;
										if(Array.isArray(obj[k])) {
											return ks + escape(JSON.stringify(obj[k]));
										} else {
											return ks + escape(stringifyPrimitive(obj[k]));
										}
									}).join(sep);
								}
              }
              var urldecode = this.urldecode = function(qs) {
                  var qry = {};
                  var pairs = qs.split("&");
                  for(var i = 0, l = pairs.length; i < l; i++) {
                      var pair = pairs[i].split("=");
                      qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
                  }
                  return qry;
              }

              this.get = function(uri, data, opts, onData, onError) {
                  if(lib.isFunction(opts)) {
                      onError = onData;
                      onData = opts;
                      opts = {};
                  }
                  opts.method = "GET";
                  opts.uri = uri + "?" + urlencode(data);
                  var req = new Request(opts);
                  onData && req.on("data", onData);
                  onError && req.on("error", onError);
                  return req;
              }
                  var getType = function(headers) {
                      if(!headers["Content-type"]) {
                          return "text";
                      }
                      if(headers["Content-type"].match(/octet-stream/i)) {
                          return "octet-stream";
                      }
											if(headers["Content-type"].match(/urlencoded/i)) {
													return "urlencoded";
											}
                      if(headers["Content-type"].match(/json/i)) {
                          return "json";
                      }
                      if(headers["Content-type"].match(/text/i)) {
                          return "text";
                      }
                  }
              var getData = function(data, headers) {
                  switch(getType(headers)) {
                      case "urlencoded":
                          return urlencode(data);
                      break;
                      case "json":
                          return JSON.stringify(data);
                      break;
                      case "octet-stream":
                          if(lib.isString(data)) {
                              return data;
                          }
                          var keys = Object.keys(data);
                          headers["x-file-name"] = keys[0];
                          return data[keys[0]];
                      break;
                      default:
                          return data.toString();
                      break;
                  }
              }
          this.post = function(uri, data, opts, onData, onError) {
              if(lib.isFunction(opts)) {
                  onError = onData;
                  onData = opts;
                  opts = {};
              }
              opts.method = "POST";
              opts.headers = opts.headers || {};
              opts.uri = uri;
              opts.data = getData(data, opts.headers);
              opts.headers["Content-length"] = opts.data.length;
              var req = new Request(opts);
              onData && req.on("data", onData);
              onError && req.on("error", onError);
              return req;
          }
          this.XMLHttpRequest = true;
      }).call(Request);

      module.exports = Request;
 
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/c/commands/animationEndEvent.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
(function() {
	var pfx = ["webkit", "moz", "MS", "o", ""];
	var addEvent = function(element, type, callback, opts) {
	    for (var p = 0; p < pfx.length; p++) {
	        if (!pfx[p]) type = type.toLowerCase();
	        element.on(pfx[p]+type, callback, opts);
	    }
	}
	var removeEvent = function(element, type, callback, opts) {
		for (var p = 0; p < pfx.length; p++) {
	        if (!pfx[p]) type = type.toLowerCase();
	        element.off(pfx[p]+type, callback, opts);
	    }
	}
	this.afterLevel = 9998;
	this.after = function(data, dom, controller) {

		var transitionEndEvent = dom.attr("latte-animationEndEvent");
		if(transitionEndEvent) {
			var Event = function(e) {
				
				if(controller.closed) {
					//controller.unbind("view", "webkitAnimationEnd", Event, false);
					return controller.unbind("view", "animationend", Event, false);
				}
				var events = transitionEndEvent.split(" ");
				events.forEach(function(eventName) {
					var click = data.get(eventName);
					click && click.call(data, e);
				});
				
			}
			controller.bind("view", "animationend", Event, false);

		}
	}
}).call(module.exports);
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/c/commands/class.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
var LatteObject = require("../../m/data")
		, latte_lib = require("latte_lib");
	var Command = {};
	(function() {
		this.after = function(data, view, controller) {
			
			var classStr = view.attr("latte-class");
			if(classStr) {
				var ifs = LatteObject.stringRegExp(classStr, "{!", "!}");
				var json = {};
				ifs.forEach(function(key) {
					console.log(key);
					var split1s = key.split("?");
					var k = split1s[0].trim();
					
					var split2s = split1s[1].split(":");
					
					var change = function(value, old) {
						if(value == old) {return;}
						if(split2s[0].trim() != "") {
							view.classed(split2s[0].trim() ,value);
						}
						if(split2s[1].trim() != "") {
							view.classed(split2s[1].trim(), !value);
						}

						
					};
					classStr = classStr.replace("{!"+key+"!}", data.get(k)? split2s[0].trim():split2s[1].trim());
					controller.bind("data", k, change);

				});
				var keys = LatteObject.stringRegExp(classStr);
				

				keys.forEach(function(key) {
					json[key] = data.get(key) || "";
					var change = function(value, oldValue) {
						if(controller.closed) {
							controller.unbind("data", key, change);
						}

						view.classed(oldValue, 0);
						view.classed(value, 1);
						
					}
					controller.bind("data", key, change);
					
				});
		
				view.node().className = view.node().className + " " +latte_lib.format.templateStringFormat(classStr, json);
				
			}
			

		};
	}).call(Command);
	
	module.exports = Command;
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/c/commands/click.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
	/**
		<button latte-click="click"></button>
		data : {
			click: function(e) {
				console.log(this, e);   //data, e
			}
		}
	*/
	var Command = {};
	(function() {
		this.after = function(data, dom, controller) {
			var clickAttribute = dom.attr("latte-click");
			if(clickAttribute) {
				var clickEvent = function(e) {
					if(controller.closed) {
						return controller.unbind("view", "click", clickEvent);
					}
					var events = clickAttribute.split(" ");
					events.forEach(function(eventName) {
						var click = data.get(eventName);
						click && click.call(data, e);
					});
					
				}
				controller.bind("view", "click", clickEvent);
			}
		};
	}).call(Command);
	
	module.exports = Command;
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/c/commands/css.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
	/**
		<p latte-css="height:{{h}}px;width:{{w}}px"></p>
		
		单项绑定
		data -> view

	*/
	/**
		css 单项绑定
	*/
	var latte_lib = require("latte_lib");
	var Css = function(dom) {
		this.binds = {};
		this.dom = dom;
	};
	(function() {
		this.bind = function(value, key, o) {
			this.binds[value] = this.binds[value] || {};
			this.binds[value][key] = o;
		}
		this.set = function(key, value) {
			//this.dom.style[key] = value;
			this.dom.style(key, value);
		}
		this.change = function(k, v) {
			if(this.binds[k]) {
				var self = this;
				var change = {};
				change[k] = v;
				for(var i in this.binds[k]) {
					self.set(i, latte_lib.format.templateStringFormat(this.binds[k][i], change));
				}
			}
		}
	}).call(Css.prototype);
	(function() {
		this.create = function(cssString, dom) {
			var css = new Css(dom);
			if(latte_lib.isString(cssString)) {
				var cssPrototypes = cssString.split(";");
				cssPrototypes.forEach(function(cssPrototype) {
					var kv = cssPrototype.split(":");
					if(kv.length ==  2) {
						var key = kv[0];
						var value = kv[1];
						var openTag = value.indexOf("{{") ;
						if(openTag != -1) {
							var closeTag = value.indexOf("}}");

							var o = value.substring(openTag+2, closeTag);
						
							css.bind(o, key, value);
						}
					}
					
					
				});
			}
			return css;
		}
	}).call(Css);

		var LatteObject = require("../../m/data");
	var Command = {};
	(function() {
		this.after = function(data, dom, controller) {
			var css = dom.attr("latte-css");
			var latteObject = LatteObject.create(data);
			if(css) {
				var css = Css.create(css, dom);
				for(var i in css.binds) {
					css.change(i, data.get(i));
					(function(i){
						
						var cssDataChange = function(value) {
							if(controller.closed) {
								return controller.unbind("data", i, cssDataChange)
							}
							//css.change(i, data[i]);
							css.change(i, data.get(i));
						}
						controller.bind("data", i, cssDataChange);
					})(i);
	 				
				}
				
			}
		};
	}).call(Command);
	
	module.exports = Command;
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/c/commands/duplex.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
	var LatteObject = require("../../m/data");
	var Command = {};
	(function() {
		var changeTags = ["input", "select", "textarea"];
		this.after = function(data, dom, controller) {
			var duplex = dom.attr("latte-duplex");
			if(duplex) {
				var latteObject = LatteObject.create(data);
				var changeDomFunc;
				if(changeTags.indexOf(dom.node().tagName.toLowerCase()) != -1) {
					var domChange = function(value) {
						if(controller.closed) {
							return controller.unbind("view", "change", domChange);
						}
						data.set(duplex,  dom.value);
					}
					controller.bind("view", "change", domChange);
					changeDomFunc = function(value) {
						dom.value = value;
					};
				}else{
					dom.attr("contenteditable", "true");
					controller.bind("view", "keyup", function(event) {
						//console.log(dom.text(), data.get(duplex), duplex);
						if(dom.text() != data.get(duplex)) {
							data.set(duplex, dom.text());
						}
					});
					changeDomFunc = dom.text.bind(dom);
				}
				//console.log(dom.node().tagName);
				//controller.bind("view","change", domChange);
				
				var duplexChange = function(value) {
					if(self.closed) {
						return controller.unbind("data",duplex, duplexChange);
					}
					if( value == undefined ) {
						changeDomFunc("") ;
					} else{
						changeDomFunc(value);
					}
				}
				controller.bind("data", duplex, duplexChange);
				if( data.get(duplex) == undefined ) {
					changeDomFunc("") ;
				} else{
					changeDomFunc(data.get(duplex))  ;
				}
				
			}
			
		};
	}).call(Command);
	
	module.exports = Command;
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/c/commands/href.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
	/**
		<img latte-src="i"></img>
		一般绑定的是src
		单项

		音频有问题
	*/
	var LatteObject = require("../../m/data.js")
		, latte_lib = require("latte_lib");
	var Command = {};
	(function() {
		this.after = function(data, view, controller) {
			var stringContent = view.attr("latte-href");
			var latteObject = LatteObject.create(data);
			if(stringContent) {
				var keys = LatteObject.stringRegExp(stringContent);
				view.attr("href",  latte_lib.format.templateStringFormat(stringContent, data.toJSON()) );
				keys.forEach(function(key) {
					controller.bind("data", key, function() {
						view.attr("href",  latte_lib.format.templateStringFormat(stringContent, data.toJSON()) );
					});
				});
			}

		};
	}).call(Command);
	
	module.exports = Command;
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/c/commands/html.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
	var  latte_lib = require("latte_lib")
		, LatteObject = require("../../m/data.js") 
		, language = require("../../utils/language.js");
	/**
		<p>{{name}}</p>
		<p latte-value="{{name}}"></p>
		单项绑定
		data -> view
		缺点是使用insertHTML 修改的话不会改变
	*/
	var Command = {};
	(function() {
				var forEachJSON = function(data, key, result) {
					for(var i in data) {
						
						if(latte_lib.isObject(data[i])) {
							var ckey = latte_lib.clone(key);
							ckey.push(i);
							forEachJSON(data[i], ckey, result);
						}else if(latte_lib.isArray(data[i])){
							var ckey = latte_lib.clone(key);
							ckey.push(i);
							forEachJSON(data[i], ckey, result);
						}else{
							var ckey = latte_lib.clone(key);
							ckey.push(i);
							result[ckey.join(".")] = data[i] != null ?data[i].toString(): "undefined";
							

						}
					}
				}
			var toJSON = function(data) {
				var result = {};
				var json = data.toJSON();
				forEachJSON(json,  [], result);	
				
				return result;
			}
			var templateLanguage = function(template, options) {
				var data = template;
				var key2s = LatteObject.stringRegExp(data, "!#", "#!");
				//for(var i in key2s) {
				key2s.forEach(function(i) {
					data = data.replace(new RegExp("!#"+i+"#!","igm"), options[i] || i);
				});
					
				//}
				
				return data;
			}
		this.after = function(data, view, controller) {
			/**
			var latteValue = view.attr("latte-html");
			var func = function(stringContent) {
				var keys = LatteObject.stringRegExp(stringContent);
				view.text(latte_lib.format.templateStringFormat(stringContent, toJSON(data)));
				keys.forEach(function(key) {
					controller.bind("data", key, function(value, oldValue) {
						var text = latte_lib.format.templateStringFormat(stringContent, toJSON(data))
						text = templateLanguage(text, )
						view.text(text);
					});
				});
			}
			
			if(latteValue) {
				func(latteValue);
			}else if(view.childNodes.length == 1 && view.childNodes[0].nodeType == 3) {
				//text 转换成 latte-value
				view.attr("latte-html", view.node().value);
				func(view.text());
			}
			*/

				var doChange = function(str) {
					var text = latte_lib.format.templateStringFormat(str, toJSON(data));
					text = templateLanguage(text, language.toJSON());
					//如果有dom的话可能会修改掉dom  比如button  里面有span  会被覆盖掉   暂时没想到其他简单的解决方案
					
					var list = [];
					if(view.children.length) {
						
						var v ;
						while( v = view.children[0]) {
							list.push(v);
							view.removeChild(v);
						} 
					}
					view.text(text);
					if(list.length) {
						list.forEach(function(v) {
							view.appendChild(v);
						});
						
					}
					
					//view.text(text);
					//console.log(view.node());
					//throw new Error("???");
					//view.node().innerText = text;
				};
				var changeFunc = function(str) {
					//var keys = LatteObject.stringRegExp(str, "`{{", "}}`");
					var key1s = LatteObject.stringRegExp(str, "{{", "}}");
					var key2s = LatteObject.stringRegExp(str, "!#" , "#!" );
					doChange(str);
					key1s.forEach(function(key) {
						
						controller.bind("data", key, function(value, oldValue) {
							doChange(str);
						});
					});
					
					if(key2s.length) {
						language.on("change", function(value, old) {
							doChange(str);
						});
					}

					//var keys = LatteObject.
					
				}
			var latteValue = view.attr("latte-html");
			if(latteValue) {
				changeFunc(latteValue);
			}else if(view.childNodes.length == 1 && view.childNodes[0].nodeType == 3) {
				//text 转换成 latte-value
				view.attr("latte-html", view.node().value);
				changeFunc(view.text());
			}
		}
	}).call(Command);
	
	module.exports = Command;
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/c/commands/list.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

			var Command = {};
			(function() {
				this.beforeLevel  = 1;
				this.before = function(data, view, controller) {
					var list = view.attr("latte-list");
					var Controller = require("../controller.js");
					if(list) {
						var child = view.children[0];
						view.removeChild(child);
						var setFunc = function(i,value, old) {
							Controller.remove(view.children[i], old);
							Controller.create(view.children[i], value);
						}
						var spliceFunc= function(startIndex, removes, adds) {
							var num = removes.length;
							for(var i = 0;i < num; i++) {
								var o = view.children[startIndex];
								view.removeChild(o);
								Controller.remove(o);
							}
							var afterDom = view.children[startIndex];
							var list = this;
							adds.forEach(function(add) {
								var cloneChild = child.cloneNode(true);
								if(afterDom) {
									view.insertBefore(cloneChild, afterDom);
								}else{
									view.appendChild(cloneChild);
								}			
								
								Controller.create(cloneChild, add);
							});
						}
						var change = function(value, oldValue) {
							
							for(var i = 0, len = view.children.length; i < len; i++) {
								var c = view.children[0];
								Controller.remove(c);
								view.removeChild(c);
							}

							for(var i = 0, len = value.length; i < len; i++) {
								(function(i) {
									var cloneChild = child.cloneNode(true);					
									view.appendChild(cloneChild);
									Controller.create(view.children[i], value.get(i));
								})(i);
								
							}
							if(oldValue) {
								oldValue.off("set", setFunc);
								oldValue.off("splice", spliceFunc)
							}
							
							value.on("set", setFunc);
							value.on("splice", spliceFunc);
							
						}


						controller.bind("data", list, change);
				
						change(data.get(list));
					}
				}
			}).call(Command); 
			module.exports = Command;


});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/c/commands/show.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
(function() {
	this.afterLevel = 9999;
		var changeMS = function(time) {
			
			if(time.indexOf("ms") != -1) {
				return time.replace("ms", "") - 0;
			}
			if(time.indexOf("s") != -1) {
				return time.replace("s", "") * 1000;
			}
		}
	var getTime = function(view) {
		var duration = changeMS(view.style("animation-duration"));
		var delay = changeMS(view.style("animation-delay"));
		var count = view.style("animation-iteration-count");
		
		return delay + duration * count;
	}
	this.after = function(data, view, controller) {
		var showName = view.attr("latte-show");
		var showClass = view.attr("latte-showClass");
		var hideClass = view.attr("latte-hideClass");
		var showFunc = view.attr("latte-showFunc");
		var hideFunc = view.attr("latte-hideFunc");
		var onlyClass = view.attr("latte-onlyClass");

		var doTime = (view.attr("latte-showTimeout") - 0) || 10000;
		if(showName) {
			var old =  "";
			view._offsetHeight = view.node().offsetHeight;
			view._offsetWidth = view.node().offsetWidth;
			if( showFunc ) {
				view.attr("latte-transitionEndEvent", (view.attr("latte-transitionEndEvent") || "")+ " " + showFunc+"$callback") ;
				view.attr("latte-animationEndEvent", (view.attr("latte-animationEndEvent") || "")+ " " + showFunc+"$callback");
			}
			
			hideFunc && view.attr("latte-transitionEndEvent", (view.attr("latte-transitionEndEvent") || "")+ " " + hideFunc + "$callback") && view.attr("latte-animationEndEvent", (view.attr("latte-animationEndEvent") || "")+ " " + hideFunc + "$callback");
			showClass && view.attr("latte-transitionEndEvent", (view.attr("latte-transitionEndEvent") || "")+ " "+ showClass + "$cssCallback") && view.attr("latte-animationEndEvent", (view.attr("latte-animationEndEvent") || "")+ " "+ showClass + "$cssCallback");
			hideClass && view.attr("latte-transitionEndEvent", (view.attr("latte-transitionEndEvent") || "")+ " "+ hideClass + "$cssCallback") && view.attr("latte-animationEndEvent", (view.attr("latte-animationEndEvent") || "")+ " "+ hideClass + "$cssCallback");
			var change = function(value, oldValue) {
				if(value == oldValue && oldValue != null) {
					return;
				}
				if(!value) {
					if((!hideClass && !hideFunc && !onlyClass) || oldValue == undefined) {
						showClass &&  view.classed(showClass, 0);
						view.style("display", "none");
					}else if(hideFunc) {					
						

						var hf = data.get(hideFunc) ;
						if(hf) {
							var timeout;
							var time = getTime(view) || doTime;
							var name = hideFunc+"$callback";
							var callbackFunc;
							data.set(name, function() {
								callbackFunc && callbackFunc.call(view);
								view.style("display", "none");
								data.set(name , null);
								clearTimeout(timeout);
							});
							
							hf.call(view, function(callback) {
								callbackFunc = callback;
							});
							timeout = setTimeout(function() {
								callbackFunc && callbackFunc.call(view);
								view.style("display", "none");
								data.set(name , null);
								timeout = null;
								console.log("hide Error");
							}, time);
							
						} else{
							view.style("display", "none");
						}
							
						
					}else if(onlyClass) {
						//var timeout;
						//var name = onlyClass + "$hideCssCallback";
						//setTimeout(function() {
						var timeout;
						var time = getTime(view) || doTime;
						var name = hideClass + "$onlyCssCallback";
						data.set(name, function() {
							view.style("display", "none");
							clearTimeout(timeout);
						});
						view.classed(onlyClass, 0);	
						timeout = setTimeout(function() {
							view.style("display", "none");
							timeout = null;
							console.log("hide onlyClass Error");
						}, time);
						//}, 1);
					}else if(hideClass) {
						var timeout;
						var time = getTime(view) || doTime;
						var name = hideClass + "$cssCallback";
						data.set(name, function() {
							view.classed(hideClass, 0);
							data.set(name, null);
							view.style("display", "none");
							timeout && clearTimeout(timeout);
						});
						timeout = setTimeout(function() {
							view.classed(hideClass, 0);
							data.set(name, null);
							view.style("display", "none");
							timeout = null;
							console.log("hideClass  Error");
						}, time);
						
						view.classed(hideClass, 1);
					}
				}else{
					if((!showClass && !showFunc && !onlyClass) || oldValue == undefined ) {
						view.classed(hideClass, 0);
						view.style("display", "");
					}else if(showFunc){
						var sf = data.get(showFunc);
						view.style("display", "");
						if(sf) {
							var timeout;
							var time = getTime(view) || doTime;
							var name = showFunc + "$callback";
							var callbackFunc;
							data.set(name, function() {

								callbackFunc && callbackFunc.call(view);			
								data.set(name, null);
								timeout && clearTimeout(timeout);
							});
							setTimeout(function() {
								sf.call(view, function(callback) {
									callbackFunc = callback;
								});
								timeout = setTimeout(function() {
									callbackFunc && callbackFunc.call(view);			
									data.set(name, null);
									timeout = null;
									console.log("showFunc Error");
								}, time);
							}, 1);
							
						}
						
					}else if(onlyClass) {
						
						view.style("display", "");
						setTimeout(function() {
							view.classed(onlyClass, 1);	
						},1);
						
					}else if(showClass) {
						var timeout;
						var time = getTime(view) || doTime;
						view.style("display", "");
						var name = showClass + "$cssCallback";
						data.set(name, function() {

							view.classed(showClass, 0);
							data.set(name, null);
							timeout && clearTimeout(timeout);
						});
						setTimeout(function() {							
							view.classed(showClass, 1);
							timeout = setTimeout(function() {
								view.classed(hideClass, 0);
								data.set(name, null);
								view.style("display", "none");
								timeout = null;
								console.log("show Error");
							}, time);
						}, 1);
						
						


						
					}
				}

			}
			change((data.get(showName) || false) );
			controller.bind("data", showName, change);

		}
	}
	/**
	this.afterLevel = 9999;
	this.after = function(data, view, controller) {
		var showName = view.attr("latte-show");
		var showClass = view.attr("latte-showClass");
		var hideClass = view.attr("latte-hideClass");
		var showFunc = view.attr("latte-showFunc");
		var hideFunc = view.attr("latte-hideFunc");

		if(showName) {
			console.log(showName);
			var old =  "";
			view._offsetHeight = view.node().offsetHeight;
			view._offsetWidth = view.node().offsetWidth;
			var change = function(value, oldValue) {
				
				if(value == oldValue  && oldValue != null) {
					return;
				}
				//console.log("????", value, oldValue);
				if(!value) {
					if((!hideClass && !hideFunc) || oldValue == undefined) {
						
						showClass &&  view.classed(showClass, 0);
						view.style("display", "none");
						//hideClass && view.classed(hideClass, 1);
						//hideFunc && data.get(hideFunc) && data.get(hideFunc).call(view);
						
					}else if(hideFunc){
						
						
						var onceFunc = function() {
							removeEvent(view, "AnimationEnd", onceFunc, false);
							removeEvent(view, "TransitionEnd", onceFunc, false);
							view.style("display", "none");
						};
						addEvent(view, "AnimationEnd", onceFunc, false);
						addEvent(view, "TransitionEnd", onceFunc, false);
						setTimeout(function() {
							data.get(hideFunc) && data.get(hideFunc).call(view, function(time, callback) {
								time && setTimeout(onceFunc, time);
								onceFunc.callback = callback;
							});
						}, 2);
						

					}else if(hideClass) {
						
						var onceFunc = function() {
							view.classed(hideClass, 0);
							onceFunc.callback && onceFunc.callback.call(view);
							removeEvent(view, "AnimationEnd", onceFunc, false);
							removeEvent(view, "TransitionEnd", onceFunc, false);
							view.style("display", "none");
						};
						addEvent(view, "AnimationEnd", onceFunc, false);
						addEvent(view, "TransitionEnd", onceFunc, false);
						view.classed(hideClass, 1);

					}
					
				}else {
					
					if((!showClass && !showFunc) || oldValue == undefined ) {
						hideClass &&  view.classed(hideClass, 0);
						//showClass && view.classed(showClass, 1);
						//data.get(showFunc) && data.get(showFunc).call(view);
						view.style("display", "");
					}else if(showFunc){
						
						view.style("display", "");
					
						var onceFunc = function() {					
							removeEvent(view, "AnimationEnd", onceFunc, false);
							removeEvent(view, "TransitionEnd", onceFunc, false);
							onceFunc.callback && onceFunc.callback.call(view);
						}
						addEvent(view, "AnimationEnd", onceFunc, false);
						addEvent(view, "TransitionEnd", onceFunc, false);
						setTimeout(function() {

							data.get(showFunc) && data.get(showFunc).call(view ,function(time, callback) {
								time && setTimeout(onceFunc, time);
								onceFunc.callback = callback;
							});
							
						}, 2);
						
						
					}else if(showClass){
						var classs = showClass.split(" ");
						view.style("display", "");
						var onceFunc = function() {
							
							classs.forEach(function(o) {
								view.classed(o, 0);
							});
							removeEvent(view, "AnimationEnd", onceFunc, false);
							removeEvent(view, "TransitionEnd", onceFunc, false);
							//view.style("display", old);
						};
						addEvent(view, "AnimationEnd", onceFunc, false);
						addEvent(view, "TransitionEnd", onceFunc, false);
						setTimeout(function() {
							classs.forEach(function(o) {
								view.classed(o, 1);
							});
							
						}, 2);
						
					}
				}
				
			};
			//data.set(showName, data.set(showName) || false);
			change((data.get(showName) || false) );
			controller.bind("data", showName, change);
		}
	}
	*/
}).call(module.exports);
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/c/commands/src.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {



	/**
		<img latte-src="i"></img>
		一般绑定的是src
		单项

		音频有问题
	*/
	var LatteObject = require("../../m/data.js")
		, latte_lib = require("latte_lib");
	var Command = {};
	(function() {
		this.after = function(data, view, controller) {
			var stringContent = view.attr("latte-src");
			var latteObject = LatteObject.create(data);
			if(stringContent) {
				var keys = LatteObject.stringRegExp(stringContent);
				view.attr("src",  latte_lib.format.templateStringFormat(stringContent, data.toJSON()) );
				keys.forEach(function(key) {
					controller.bind("data", key, function() {
						view.attr("src",  latte_lib.format.templateStringFormat(stringContent, data.toJSON()) );
					});
				});
			}

		};
	}).call(Command);
	
	module.exports = Command;
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/c/commands/transitionEndEvent.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
(function() {
	var pfx = ["webkit", "moz", "MS", "o", ""];
	var addEvent = function(element, type, callback, opts) {
	    for (var p = 0; p < pfx.length; p++) {
	        if (!pfx[p]) type = type.toLowerCase();
	        element.on(pfx[p]+type, callback, opts);
	    }
	}
	var removeEvent = function(element, type, callback, opts) {
		for (var p = 0; p < pfx.length; p++) {
	        if (!pfx[p]) type = type.toLowerCase();
	        element.off(pfx[p]+type, callback, opts);
	    }
	}
	this.afterLevel = 9998;
	this.after = function(data, dom, controller) {
		var transitionEndEvent = dom.attr("latte-transitionEndEvent");
		if(transitionEndEvent) {
			var Event = function(e) {
				if(controller.closed) {
					return controller.unbind("view", "transitionend", Event, false);
				}
				var events = transitionEndEvent.split(" ");
				events.forEach(function(eventName) {
					var click = data.get(eventName);
					click && click.call(data, e);
				});
				
			}
			controller.bind("view", "transitionend", Event, false);
		}
	}
}).call(module.exports);
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/c/controller.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
	/**
		设计上一个view ->controller
	*/
	var latte_lib = require("latte_lib")
		, LatteObject = require("../m/data.js")
		, View = require("../v/index.js");
		var Controller = function(view, data) {
			view.latteController = this;
			this.dom = view;
			view = this.view = View.create(view);
			if(view.attr("latte-template")) {
				view.html(data.get(view.attr("latte-template")));
			}
			if(view.attr("latte-data")) {
				this.data = data.get(view.attr("latte-data"));
			}else{
				this.data = data;
			}
			if(!this.data) {
				console.log(data, view.attr("latte-data"));
				throw new Error("data "+view.attr("latte-data")+" Error");
			}
			this.dataEvents = {};
			this.viewEvents = {};
			var self = this;
		

			Controller.befores.forEach(function(command){
				command(self.data, view, self);
			});
			Controller.middle(self.data, view, self);
			Controller.afters.forEach(function(command) {
				command(self.data, view, self);
			});
			this.emit("finish");
			//view.attr("latte-finish") && data.get(view.attr("latte-finish")) && data.get(view.attr("latte-finish")).call(this);
		};
		latte_lib.debug.error = function(e) {
			console.error(e);
		};
		latte_lib.inherits(Controller, latte_lib.events);
 		(function() {
			
			/**	
				存在问题 就是dom 并不是root
			*/
			this.bind = function(type, eventType, funcs, ops) {
				if(!latte_lib.isArray(funcs)) {
					funcs = [funcs];
				}
				var f, events = this[type+"Events"];
				switch(type) {
					case "data":
						var o = this.data;
						f = o.on.bind(o);

					break;
					case "view":
						//f = this.view.addEventListener.bind(this.view);
						f = this.view.on.bind(this.view);
					break;
					default:
						latte_lib.debug.error("no the type");
						return;
					break;
				}
				
				for(var i = 0, len = funcs.length; i < len ; i++ ) {
					var func = funcs[i];
					if(!latte_lib.isFunction(func)) {
						latte_lib.debug.error("add function");
						return;
					}
					f(eventType, func);
				}
				events[eventType] = funcs.concat(events[eventType]);
			}
			this.unbind = function(type, eventType,funcs) {
				var f , events = this[type+"Events"];
				if(!latte_lib.isArray(funcs)) {
					funcs = [funcs];
				}
				switch(type) {
					case "data":
						f = this.data.off.bind(this.data);
					break;
					case "view":
						f = this.view.off.bind(this.view);
					break;
				}
				for(var i = 0, len = funcs.length; i < len; i++) {
					var func = funcs[i]
						, fIndex = events[eventType].indexOf(func);
					if(fIndex == -1) {
						latte_lib.debug.error("not find the func");
					}
					f(eventType, func, ops);
					events[eventType].splice(fIndex, 1); 
				}

			}
			
			this.close = function() {
				this.closed = 1;
				var o = LatteObject.create(this.data);
				var latteOff = o.off.bind(o);
				for(var i in this.dataEvents) {
					this.dataEvents[i].forEach(function(func) {
						latteOff(i, func);
					});
					delete this.dataEvents[i];
				}
				var viewOff = this.view.off.bind(this.view);
				for(var i in this.viewEvents) {
					this.viewEvents[i].forEach(function(func) {
						viewOff(i, func);
					});
					delete this.viewEvents[i];
				}

				for(var i = 0, len = this.view.children.length; i < len; i++) {
					Controller.remove(this.view.children[i]);
				}
				
				delete this.dom.latteController;
				this.emit("close");
			}
		}).call(Controller.prototype);
		(function() {
			this.befores = [];
			this.afters = [];
			this.middle = function(data, view, controller) {
				if(view.attr("latte-stop")) {
					return;
				}
			
				for(var i = 0, l = view.children.length; i < l ; i++) {
					(function(i, view) {
						var child = view.children[i];				
						Controller.create(child, data);
					})(i, view);
										
				}
			};
			
			this.addBefore = function(func) {
				if(latte_lib.isFunction(func)) {
					this.befores.push(func);
				}	
			}
			this.addAfter = function(func) {
				if(latte_lib.isFunction(func)) {
					this.afters.push(func);
				}
			}
			this.create = function(dom, data) {
				if(dom.latteController) {
					return dom.latteController;
				}
				data = LatteObject.create(data);
				//view = View.create(dom);
				return new Controller(dom, data);
			}
			this.remove = function(dom, data, controller) {
				if(!dom) {
					return;
				}
				//console.log(dom.latteController.view , dom, dom.latteController.view == dom);
				controller = controller || dom.latteController;
				controller && controller.close();
			}
			this.removeChild = function(dom) {
				for(var i = 0, len = dom.children.length; i < len; i++) {
					Controller.remove(dom.children[i]);
					dom.removeChild(dom.children[i]);
				}
			}
			this.createChild = function(dom, data) {
				for(var i = 0, len = dom.children.length; i < len; i++) {
					Controller.create(dom.children[i], data);
				}
			}
			this.addCommand = function(func) {
				Controller.addBefore(func.before);
				Controller.addAfter(func.after || func);
			}
		}).call(Controller);
		var funcs = latte.require.find("latte_dom/c/commands/").map(function(o){
			//var r = require("./commands/"+o);
			//Controller.addCommand(r );
			var r = require("./commands/"+o);
			return r;
		});

		var befores = funcs.sort(function(a, b ) {
			
			return  (b.beforeLevel || b.level || 0) - (a.beforeLevel || a.level || 0)  ;
				
		});

		befores.forEach(function(b) {
			if(b.before) {
				Controller.addBefore(b.before);
			}	
		});
		var afters = funcs.sort(function(a, b) {
			return  (b.afterLevel || b.level || 0) - (a.afterLevel || a.level || 0)   ;
				
		});
		
		afters.forEach(function(a) {
			if(a.after) {
				Controller.addAfter(a.after);
			}
		});
		module.exports = Controller;
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/index.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
(function() {
	var Dom = require("./v/dom")
		, Data = require("./m/data")
		, Controller = require("./c/controller")
		, latte_lib = require("latte_lib");
		var find = function(id) {
			return document.querySelectorAll("*[latte-controller='"+id+"']");
		}
	this.define = function(id, data) {
		var doms = find(id);
		var controllers = [];
		if(doms) {
			for(var i = 0, len = doms.length ; i < len; i++) {
				var dom = doms[i];
				var controller = Controller.create(dom, data);
				controllers.push(controller);
			}
		}
		return controllers;
	}
	this.language = require("./utils/language.js");
	this.css = require("./utils/css.js");

}).call(module.exports);
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/m/data.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
	
	(function() {
		this.stringRegExp = function(str, prefix , suffix) {
			prefix = prefix || "{{";
			suffix =  suffix || "}}";
			var vernier = 0;
			var next = 1;
			var keys = [];
			while(next) {
				var startIndex = str.indexOf(prefix, vernier);
				if(startIndex == -1) {
					next = 0;
					return keys;
				}
				var endIndex = str.indexOf(suffix, startIndex);
				if(endIndex == -1) {
					next = 0;
					return keys;
				}
				keys.push(str.substring(startIndex+prefix.length, endIndex));
				vernier = endIndex;
			}
			
		}
		this.create = require("latte_lib").object.create;
		/**
		if(Object.observe) {
			this.create = require("./observe.js").create;
		}else if(Object.defineProperty) {
			
		}else{
			throw  new Error("This version does not support your browser ");
		}
		**/
	}).call(module.exports);
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/utils/css.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
(function(){
	var self = this;
	this.hasCssString = function(id, doc) {
		var index = 0, sheets;
		doc = doc || document;
		if(doc.createStyleSheet && (sheets = doc.styleSheets)) {
			while(index < sheets.length) {
				if(sheets[index++].owningElement.id==id) {
					return true;
				}
			}
		}else if((sheets = doc.getElementsByTagName("style"))) {
			while(index < sheets.length) {
				if(sheets[index++].id === id) {
					return true;
				}
			}
		}
		return false;
	}
	var Dom = {
		createElement: function(tag, ns) {
			var XHTML_NS = "http://www.w3.org/1999/xhtml";
			return document.createElementNS?
			document.createElementNS(ns || XHTML_NS, tag)
			: document.createElement(tag);
		},
		getDocumentHead : function(doc) {
			if(!doc) {
				doc = document;
			}
			return doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement;
		}
	}
	this.importCssString = function(cssText, id, doc) {
		doc = doc || document;
		if(id && self.hasCssString(id, doc))
			return null;
		var style;
		if(doc.createStyleSheet) {
			style = doc.createStyleSheet();
			style.cssText = cssText;
			if(id) {
				style.owningElement.id = id;
			}
		} else {
			style = Dom.createElement("style");
			style.appendChild(doc.createTextNode(cssText));
			//style.innerHTML = cssText;
			if(id) {
				style.id = id;
			}
			Dom.getDocumentHead(doc).appendChild(style);
		}
	}
}).call(module.exports);
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/utils/href.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
(function() {
	var self= this;
	this.setHash = function(hash) {
		var url = self.parse(window.location.href);
		url.hash = hash;
		window.location.href = url.format();
	}
	
	this.getHash = function(url) {
		var url = self.parse(window.location.href);
		return url.hash;
	}

	this.getQuery = function() {
		var url = self.parse(window.location.href);
		return QueryString.parse(url.query);
	}
	this.setQuery = function(key, value) {
		var url = self.parse(window.location.href);
		var queryObject = QueryString.parse(url.query);
		queryObject[key] = value;
		url.query = QueryString.stringify(queryObject);
		window.location.href = url.format();
	}

	var regexNonASCII = /[^\x20-\x7E]/
		, regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g;
			function map(array, fn) {
				var length = array.length;
				var result = [];
				while (length--) {
					result[length] = fn(array[length]);
				}
				return result;
			}
		function mapDomain(string, fn) {
			var parts = string.split('@');
			var result = '';
			if (parts.length > 1) {
				// In email addresses, only the domain name should be punycoded. Leave
				// the local part (i.e. everything up to `@`) intact.
				result = parts[0] + '@';
				string = parts[1];
			}
			// Avoid `split(regex)` for IE8 compatibility. See #17.
			string = string.replace(regexSeparators, '\x2E');
			var labels = string.split('.');
			var encoded = map(labels, fn).join('.');
			return result + encoded;
		}
	var punycode = {
		toASCII : function(input) {
			return mapDomain(input, function(string) {
				return regexNonASCII.test(string)
					? 'xn--' + encode(string)
					: string;
			});
		}
	}

	var Url = function() {
		this.protocol = null;
		this.slashes = null;
		this.auth = null;
		this.host = null;
		this.port = null;
		this.hostname = null;
		this.hash = null;
		this.search = null;
		this.query = null;
		this.pathname = null;
		this.path = null;
		this.href = null;
	};
	var  protocolPattern = /^([a-z0-9.+-]+:)/i;
	var portPattern = /:[0-9]*$/;
	var hostlessProtocol = {
	  'javascript': true,
	  'javascript:': true
	};
	var hostEndingChars = ['/', '?', '#'];
	var nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape);
	var autoEscape = ['\''].concat(unwise);
	var unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims);
	var delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'];
	var hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/;
	var simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/;
	var hostnameMaxLen = 255;
	var unsafeProtocol = {
	  'javascript': true,
	  'javascript:': true
	};
	var  slashedProtocol = {
	  'http': true,
	  'https': true,
	  'ftp': true,
	  'gopher': true,
	  'file': true,
	  'http:': true,
	  'https:': true,
	  'ftp:': true,
	  'gopher:': true,
	  'file:': true
	};
	(function() {
		this.parse = function(url, parseQueryString, slashesDenoteHost) {
			if (typeof url !== 'string') {
    			throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  			}
  			var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
		      uSplit = url.split(splitter),
		      slashRegex = /\\/g;
		  uSplit[0] = uSplit[0].replace(slashRegex, '/');
		  url = uSplit.join(splitter);

		  var rest = url;

		  // trim before proceeding.
		  // This is to support parse stuff like "  http://foo.com  \n"
		  rest = rest.trim();

		  if (!slashesDenoteHost && url.split('#').length === 1) {
		    // Try fast path regexp
		    var simplePath = simplePathPattern.exec(rest);
		    if (simplePath) {
		      this.path = rest;
		      this.href = rest;
		      this.pathname = simplePath[1];
		      if (simplePath[2]) {
		        this.search = simplePath[2];
		        if (parseQueryString) {
		          this.query = querystring.parse(this.search.substr(1));
		        } else {
		          this.query = this.search.substr(1);
		        }
		      } else if (parseQueryString) {
		        this.search = '';
		        this.query = {};
		      }
		      return this;
		    }
		  }

		  var proto = protocolPattern.exec(rest);
		  if (proto) {
		    proto = proto[0];
		    var lowerProto = proto.toLowerCase();
		    this.protocol = lowerProto;
		    rest = rest.substr(proto.length);
		  }

		  // figure out if it's got a host
		  // user@server is *always* interpreted as a hostname, and url
		  // resolution will treat //foo/bar as host=foo,path=bar because that's
		  // how the browser resolves relative URLs.
		  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
		    var slashes = rest.substr(0, 2) === '//';
		    if (slashes && !(proto && hostlessProtocol[proto])) {
		      rest = rest.substr(2);
		      this.slashes = true;
		    }
		  }

		  if (!hostlessProtocol[proto] &&
		      (slashes || (proto && !slashedProtocol[proto]))) {

		    // there's a hostname.
		    // the first instance of /, ?, ;, or # ends the host.
		    //
		    // If there is an @ in the hostname, then non-host chars *are* allowed
		    // to the left of the last @ sign, unless some host-ending character
		    // comes *before* the @-sign.
		    // URLs are obnoxious.
		    //
		    // ex:
		    // http://a@b@c/ => user:a@b host:c
		    // http://a@b?@c => user:a host:b path:/?@c

		    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
		    // Review our test case against browsers more comprehensively.

		    // find the first instance of any hostEndingChars
		    var hostEnd = -1;
		    for (var i = 0; i < hostEndingChars.length; i++) {
		      var hec = rest.indexOf(hostEndingChars[i]);
		      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
		        hostEnd = hec;
		    }

		    // at this point, either we have an explicit point where the
		    // auth portion cannot go past, or the last @ char is the decider.
		    var auth, atSign;
		    if (hostEnd === -1) {
		      // atSign can be anywhere.
		      atSign = rest.lastIndexOf('@');
		    } else {
		      // atSign must be in auth portion.
		      // http://a@b/c@d => host:b auth:a path:/c@d
		      atSign = rest.lastIndexOf('@', hostEnd);
		    }

		    // Now we have a portion which is definitely the auth.
		    // Pull that off.
		    if (atSign !== -1) {
		      auth = rest.slice(0, atSign);
		      rest = rest.slice(atSign + 1);
		      this.auth = decodeURIComponent(auth);
		    }

		    // the host is the remaining to the left of the first non-host char
		    hostEnd = -1;
		    for (var i = 0; i < nonHostChars.length; i++) {
		      var hec = rest.indexOf(nonHostChars[i]);
		      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
		        hostEnd = hec;
		    }
		    // if we still have not hit it, then the entire thing is a host.
		    if (hostEnd === -1)
		      hostEnd = rest.length;

		    this.host = rest.slice(0, hostEnd);
		    rest = rest.slice(hostEnd);

		    // pull out port.
		    this.parseHost();

		    // we've indicated that there is a hostname,
		    // so even if it's empty, it has to be present.
		    this.hostname = this.hostname || '';

		    // if hostname begins with [ and ends with ]
		    // assume that it's an IPv6 address.
		    var ipv6Hostname = this.hostname[0] === '[' &&
		        this.hostname[this.hostname.length - 1] === ']';

		    // validate a little.
		    if (!ipv6Hostname) {
		      var hostparts = this.hostname.split(/\./);
		      for (var i = 0, l = hostparts.length; i < l; i++) {
		        var part = hostparts[i];
		        if (!part) continue;
		        if (!part.match(hostnamePartPattern)) {
		          var newpart = '';
		          for (var j = 0, k = part.length; j < k; j++) {
		            if (part.charCodeAt(j) > 127) {
		              // we replace non-ASCII char with a temporary placeholder
		              // we need this to make sure size of hostname is not
		              // broken by replacing non-ASCII by nothing
		              newpart += 'x';
		            } else {
		              newpart += part[j];
		            }
		          }
		          // we test again with ASCII char only
		          if (!newpart.match(hostnamePartPattern)) {
		            var validParts = hostparts.slice(0, i);
		            var notHost = hostparts.slice(i + 1);
		            var bit = part.match(hostnamePartStart);
		            if (bit) {
		              validParts.push(bit[1]);
		              notHost.unshift(bit[2]);
		            }
		            if (notHost.length) {
		              rest = '/' + notHost.join('.') + rest;
		            }
		            this.hostname = validParts.join('.');
		            break;
		          }
		        }
		      }
		    }

		    if (this.hostname.length > hostnameMaxLen) {
		      this.hostname = '';
		    } else {
		      // hostnames are always lower case.
		      this.hostname = this.hostname.toLowerCase();
		    }

		    if (!ipv6Hostname) {
		      // IDNA Support: Returns a punycoded representation of "domain".
		      // It only converts parts of the domain name that
		      // have non-ASCII characters, i.e. it doesn't matter if
		      // you call it with a domain that already is ASCII-only.
		      this.hostname = punycode.toASCII(this.hostname);
		    }

		    var p = this.port ? ':' + this.port : '';
		    var h = this.hostname || '';
		    this.host = h + p;

		    // strip [ and ] from the hostname
		    // the host field still retains them, though
		    if (ipv6Hostname) {
		      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
		      if (rest[0] !== '/') {
		        rest = '/' + rest;
		      }
		    }
		  }

		  // now rest is set to the post-host stuff.
		  // chop off any delim chars.
		  if (!unsafeProtocol[lowerProto]) {

		    // First, make 100% sure that any "autoEscape" chars get
		    // escaped, even if encodeURIComponent doesn't think they
		    // need to be.
		    for (var i = 0, l = autoEscape.length; i < l; i++) {
		      var ae = autoEscape[i];
		      if (rest.indexOf(ae) === -1)
		        continue;
		      var esc = encodeURIComponent(ae);
		      if (esc === ae) {
		        esc = escape(ae);
		      }
		      rest = rest.split(ae).join(esc);
		    }
		  }


		  // chop off from the tail first.
		  var hash = rest.indexOf('#');
		  if (hash !== -1) {
		    // got a fragment string.
		    this.hash = rest.substr(hash);
		    rest = rest.slice(0, hash);
		  }
		  var qm = rest.indexOf('?');
		  if (qm !== -1) {
		    this.search = rest.substr(qm);
		    this.query = rest.substr(qm + 1);
		    if (parseQueryString) {
		      this.query = querystring.parse(this.query);
		    }
		    rest = rest.slice(0, qm);
		  } else if (parseQueryString) {
		    // no query string, but parseQueryString still requested
		    this.search = '';
		    this.query = {};
		  }
		  if (rest) this.pathname = rest;
		  if (slashedProtocol[lowerProto] &&
		      this.hostname && !this.pathname) {
		    this.pathname = '/';
		  }

		  //to support http.request
		  if (this.pathname || this.search) {
		    var p = this.pathname || '';
		    var s = this.search || '';
		    this.path = p + s;
		  }

		  // finally, reconstruct the href based on what has been validated.
		  this.href = this.format();
		  return this;
		}
		this.parseHost = function() {
		  var host = this.host;
		  var port = portPattern.exec(host);
		  if (port) {
		    port = port[0];
		    if (port !== ':') {
		      this.port = port.substr(1);
		    }
		    host = host.substr(0, host.length - port.length);
		  }
		  if (host) this.hostname = host;
		};
		this.format = function() {
		  var auth = this.auth || '';
		  if (auth) {
		    auth = encodeURIComponent(auth);
		    auth = auth.replace(/%3A/i, ':');
		    auth += '@';
		  }

		  var protocol = this.protocol || '',
		      pathname = this.pathname || '',
		      hash = this.hash || '',
		      host = false,
		      query = '';

		  if (this.host) {
		    host = auth + this.host;
		  } else if (this.hostname) {
		    host = auth + (this.hostname.indexOf(':') === -1 ?
		        this.hostname :
		        '[' + this.hostname + ']');
		    if (this.port) {
		      host += ':' + this.port;
		    }
		  }

		  if (this.query !== null &&
		      typeof this.query === 'object' &&
		      Object.keys(this.query).length) {
		    query = querystring.stringify(this.query);
		  }

		  var search = this.search || (query && ('?' + query)) || '';

		  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

		  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
		  // unless they had them to begin with.
		  if (this.slashes ||
		      (!protocol || slashedProtocol[protocol]) && host !== false) {
		    host = '//' + (host || '');
		    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
		  } else if (!host) {
		    host = '';
		  }

		  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
		  if (search && search.charAt(0) !== '?') search = '?' + search;

		  pathname = pathname.replace(/[?#]/g, function(match) {
		    return encodeURIComponent(match);
		  });
		  search = search.replace('#', '%23');

		  return protocol + host + pathname + search + hash;
		};
	}).call(Url.prototype);
	this.parse = function(url, parseQueryString, slashesDenoteHost){
		
		if(url instanceof Url) return url;
		var u = new Url();
		u.parse(url,parseQueryString, slashesDenoteHost);
		return u;
	};
	//nodejs  url.js and querystring.js
	var QueryString =  {};
	var querystring = QueryString;
	function ParsedQueryString() {}
	
	(function() {
		function qsUnescape(s, decodeSpaces) {
		  try {
		    return decodeURIComponent(s);
		  } catch (e) {
		    return QueryString.unescapeBuffer(s, decodeSpaces).toString();
		  }
		}
		this.unescape = qsUnescape;
		this.parse = function(qs, sep, eq, options) {
		  sep = sep || '&';
		  eq = eq || '=';

		  var obj = new ParsedQueryString();

		  if (typeof qs !== 'string' || qs.length === 0) {
		    return obj;
		  }

		  if (typeof sep !== 'string')
		    sep += '';

		  var eqLen = eq.length;
		  var sepLen = sep.length;

		  var maxKeys = 1000;
		  if (options && typeof options.maxKeys === 'number') {
		    maxKeys = options.maxKeys;
		  }

		  var pairs = Infinity;
		  if (maxKeys > 0)
		    pairs = maxKeys;

		  var decode = QueryString.unescape;
		  if (options && typeof options.decodeURIComponent === 'function') {
		    decode = options.decodeURIComponent;
		  }
		  var customDecode = (decode !== qsUnescape);

		  var keys = [];
		  var lastPos = 0;
		  var sepIdx = 0;
		  var eqIdx = 0;
		  var key = '';
		  var value = '';
		  var keyEncoded = customDecode;
		  var valEncoded = customDecode;
		  var encodeCheck = 0;
		  for (var i = 0; i < qs.length; ++i) {
		    var code = qs.charCodeAt(i);

		    // Try matching key/value pair separator (e.g. '&')
		    if (code === sep.charCodeAt(sepIdx)) {
		      if (++sepIdx === sepLen) {
		        // Key/value pair separator match!
		        var end = i - sepIdx + 1;
		        if (eqIdx < eqLen) {
		          // If we didn't find the key/value separator, treat the substring as
		          // part of the key instead of the value
		          if (lastPos < end)
		            key += qs.slice(lastPos, end);
		        } else if (lastPos < end)
		          value += qs.slice(lastPos, end);
		        if (keyEncoded)
		          key = decodeStr(key, decode);
		        if (valEncoded)
		          value = decodeStr(value, decode);
		        // Use a key array lookup instead of using hasOwnProperty(), which is
		        // slower
		        if (keys.indexOf(key) === -1) {
		          obj[key] = value;
		          keys[keys.length] = key;
		        } else {
		          var curValue = obj[key];
		          // `instanceof Array` is used instead of Array.isArray() because it
		          // is ~15-20% faster with v8 4.7 and is safe to use because we are
		          // using it with values being created within this function
		          if (curValue instanceof Array)
		            curValue[curValue.length] = value;
		          else
		            obj[key] = [curValue, value];
		        }
		        if (--pairs === 0)
		          break;
		        keyEncoded = valEncoded = customDecode;
		        encodeCheck = 0;
		        key = value = '';
		        lastPos = i + 1;
		        sepIdx = eqIdx = 0;
		      }
		      continue;
		    } else {
		      sepIdx = 0;
		      if (!valEncoded) {
		        // Try to match an (valid) encoded byte (once) to minimize unnecessary
		        // calls to string decoding functions
		        if (code === 37/*%*/) {
		          encodeCheck = 1;
		        } else if (encodeCheck > 0 &&
		                   ((code >= 48/*0*/ && code <= 57/*9*/) ||
		                    (code >= 65/*A*/ && code <= 70/*F*/) ||
		                    (code >= 97/*a*/ && code <= 102/*f*/))) {
		          if (++encodeCheck === 3)
		            valEncoded = true;
		        } else {
		          encodeCheck = 0;
		        }
		      }
		    }

		    // Try matching key/value separator (e.g. '=') if we haven't already
		    if (eqIdx < eqLen) {
		      if (code === eq.charCodeAt(eqIdx)) {
		        if (++eqIdx === eqLen) {
		          // Key/value separator match!
		          var end = i - eqIdx + 1;
		          if (lastPos < end)
		            key += qs.slice(lastPos, end);
		          encodeCheck = 0;
		          lastPos = i + 1;
		        }
		        continue;
		      } else {
		        eqIdx = 0;
		        if (!keyEncoded) {
		          // Try to match an (valid) encoded byte once to minimize unnecessary
		          // calls to string decoding functions
		          if (code === 37/*%*/) {
		            encodeCheck = 1;
		          } else if (encodeCheck > 0 &&
		                     ((code >= 48/*0*/ && code <= 57/*9*/) ||
		                      (code >= 65/*A*/ && code <= 70/*F*/) ||
		                      (code >= 97/*a*/ && code <= 102/*f*/))) {
		            if (++encodeCheck === 3)
		              keyEncoded = true;
		          } else {
		            encodeCheck = 0;
		          }
		        }
		      }
		    }

		    if (code === 43/*+*/) {
		      if (eqIdx < eqLen) {
		        if (i - lastPos > 0)
		          key += qs.slice(lastPos, i);
		        key += '%20';
		        keyEncoded = true;
		      } else {
		        if (i - lastPos > 0)
		          value += qs.slice(lastPos, i);
		        value += '%20';
		        valEncoded = true;
		      }
		      lastPos = i + 1;
		    }
		  }

		  // Check if we have leftover key or value data
		  if (pairs > 0 && (lastPos < qs.length || eqIdx > 0)) {
		    if (lastPos < qs.length) {
		      if (eqIdx < eqLen)
		        key += qs.slice(lastPos);
		      else if (sepIdx < sepLen)
		        value += qs.slice(lastPos);
		    }
		    if (keyEncoded)
		      key = decodeStr(key, decode);
		    if (valEncoded)
		      value = decodeStr(value, decode);
		    // Use a key array lookup instead of using hasOwnProperty(), which is
		    // slower
		    if (keys.indexOf(key) === -1) {
		      obj[key] = value;
		      keys[keys.length] = key;
		    } else {
		      var curValue = obj[key];
		      // `instanceof Array` is used instead of Array.isArray() because it
		      // is ~15-20% faster with v8 4.7 and is safe to use because we are
		      // using it with values being created within this function
		      if (curValue instanceof Array)
		        curValue[curValue.length] = value;
		      else
		        obj[key] = [curValue, value];
		    }
		  }

		  return obj;
		};


		this.escape = function(str) {
		  // replaces encodeURIComponent
		  // http://www.ecma-international.org/ecma-262/5.1/#sec-15.1.3.4
		  if (typeof str !== 'string') {
		    if (typeof str === 'object')
		      str = String(str);
		    else
		      str += '';
		  }
		  var out = '';
		  var lastPos = 0;

		  for (var i = 0; i < str.length; ++i) {
		    var c = str.charCodeAt(i);

		    // These characters do not need escaping (in order):
		    // ! - . _ ~
		    // ' ( ) *
		    // digits
		    // alpha (uppercase)
		    // alpha (lowercase)
		    if (c === 0x21 || c === 0x2D || c === 0x2E || c === 0x5F || c === 0x7E ||
		        (c >= 0x27 && c <= 0x2A) ||
		        (c >= 0x30 && c <= 0x39) ||
		        (c >= 0x41 && c <= 0x5A) ||
		        (c >= 0x61 && c <= 0x7A)) {
		      continue;
		    }

		    if (i - lastPos > 0)
		      out += str.slice(lastPos, i);

		    // Other ASCII characters
		    if (c < 0x80) {
		      lastPos = i + 1;
		      out += hexTable[c];
		      continue;
		    }

		    // Multi-byte characters ...
		    if (c < 0x800) {
		      lastPos = i + 1;
		      out += hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)];
		      continue;
		    }
		    if (c < 0xD800 || c >= 0xE000) {
		      lastPos = i + 1;
		      out += hexTable[0xE0 | (c >> 12)] +
		             hexTable[0x80 | ((c >> 6) & 0x3F)] +
		             hexTable[0x80 | (c & 0x3F)];
		      continue;
		    }
		    // Surrogate pair
		    ++i;
		    var c2;
		    if (i < str.length)
		      c2 = str.charCodeAt(i) & 0x3FF;
		    else
		      throw new URIError('URI malformed');
		    lastPos = i + 1;
		    c = 0x10000 + (((c & 0x3FF) << 10) | c2);
		    out += hexTable[0xF0 | (c >> 18)] +
		           hexTable[0x80 | ((c >> 12) & 0x3F)] +
		           hexTable[0x80 | ((c >> 6) & 0x3F)] +
		           hexTable[0x80 | (c & 0x3F)];
		  }
		  if (lastPos === 0)
		    return str;
		  if (lastPos < str.length)
		    return out + str.slice(lastPos);
		  return out;
		};
		var stringifyPrimitive = function(v) {
		  if (typeof v === 'string')
		    return v;
		  if (typeof v === 'number' && isFinite(v))
		    return '' + v;
		  if (typeof v === 'boolean')
		    return v ? 'true' : 'false';
		  return '';
		};

		this.stringify = function(obj, sep, eq, options) {
		  sep = sep || '&';
		  eq = eq || '=';

		  var encode = QueryString.escape;
		  if (options && typeof options.encodeURIComponent === 'function') {
		    encode = options.encodeURIComponent;
		  }

		  if (obj !== null && typeof obj === 'object') {
		    var keys = Object.keys(obj);
		    var len = keys.length;
		    var flast = len - 1;
		    var fields = '';
		    for (var i = 0; i < len; ++i) {
		      var k = keys[i];
		      var v = obj[k];
		      var ks = encode(stringifyPrimitive(k)) + eq;

		      if (Array.isArray(v)) {
		        var vlen = v.length;
		        var vlast = vlen - 1;
		        for (var j = 0; j < vlen; ++j) {
		          fields += ks + encode(stringifyPrimitive(v[j]));
		          if (j < vlast)
		            fields += sep;
		        }
		        if (vlen && i < flast)
		          fields += sep;
		      } else {
		        fields += ks + encode(stringifyPrimitive(v));
		        if (i < flast)
		          fields += sep;
		      }
		    }
		    return fields;
		  }
		  return '';
		};
	}).call(QueryString);
}).call(module.exports);
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/utils/language.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
var latte_lib = require("latte_lib");
var Language = function(language) {
	this.language = language;
	this.data =  {};
};
latte_lib.inherits(Language, latte_lib.events);
(function() {
	this.load = function(language, path, callback) {
		var self = this;
		self.language = language;
		latte_lib.xhr.get(path, {}, function(data) {
			try {
				data = JSON.parse(data);
			}catch(e) {
				console.error("language page json  format is Error");
				callback && callback(e);
			}
			self.set(language, data);
			callback && callback();
		}, function(err) {
			console.error("language page ajax Error", err);
			callback && callback(err);
		});
	}	
	this.get = function(name) {
		return this.data[this.language][name];
	}
	this.set = function(language, data) {
		var self = this;
		this.language = language;
		self.data[language] = self.data[language] || {};
		
		var now = self.data[language];
		for(var i in data) {
			self.emit(i, data[i], self.data[language][i]);
			self.data[language][i] = data[i];
		}
		console.log("change");
		self.emit("change", data, now);

	}
	this.toJSON = function() {
		return this.data[this.language];
	}
}).call(Language.prototype);
module.exports = new Language();
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/v/ease.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
(function() {
	var self = this;
	this.latte_ease_cubicInOut = function(t) {
		if(t <= 0) return 0;
		if(t >= 1) return 1;
		var t2 = t * t, t3 = t2 * t;
		return 4 * (t < .5 ? t3: 3* (t - t2) + t3 - .75);
	}
	this.get = function() {
		return self.latte_ease_cubicInOut;
	}
}).call(module.exports);
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/v/index.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
(function(){
	var View = require("./view.js");
	var ViewUtils = require("./viewUtils.js");
	Object.defineProperty(this, "event", {
		get: function() {
			return ViewUtils.event
		}
	});
	this.create = function(dom) {
		return View.create(dom);
	}
}).call(module.exports);
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/v/transition.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
var latte_transitionPrototype = []
	, View = require("./view.js")
	, latte_lib = require("latte_lib")
	, Ease = require("./ease.js");
var Utils = require("./viewUtils.js");
var Transition = function(dom) {
	this.dom = dom;
};
(function() {
	this.node = function() {
		return this.dom;
	}
	this.getData = function() {
		return Utils.getData(this.node());
	}

		var latte_interpolateTransform = function(a, b) {
			var s = [], q = [];
			a = latte.transform(a), b = latte.transform(b);
			latte_interpolateTranslate(a.translate, b.translate, s, q);
			latte_interpolateRotate(a.rotate, b.rotate, s, q);
			latte_interpolateSkew(a.skew, b.skew, s, q);
			latte_interpolateScale(a.scale, b.scale, s, q);
			a = b = null;
			return function(t) {
				var i = -1, n = q.length, o;
				while(++i < n) {
					s[(o=q[i]).i] = o.x(t);
				}
				return s.join("");
			};
		}
		var latte_interpolate = Utils.interpolate;
			var latte_transition_tween = function(groups, name, value, tween) {
				var id = groups.id, ns = groups.namespace;
				var doFunc ;
				if(latte_lib.isFunction(value)) {
					doFunc = function(node, i, j) {
				      	//node[ns][id].tween.set(name, tween(value.call(node, node.__data__, i, j)));
				      	node[ns][id].tween.set(name, tween(value.call(node, Utils.getData(node), i, j)));
				    };
				}else{
					var value = tween(value);
					doFunc = function(node) {
				      	//node[ns][id].tween.set(name, value);
				      	node[ns][id].tween.set(name, value);
				    };
				}
			    return doFunc.call(groups.node(), groups.node(), groups.getData());
			}
			var latte_interpolate = Utils.latte_interpolate;
	this.attr = function(nameNs, value) {
		if(arguments.length < 2) {
			for(value in nameNs) {
				this.attr(value, nameNs[value]);
			}
			return this;
		}
		var interpolate = nameNs == "transform" ? 
			latte_interpolateTransform: latte_interpolate
			, name = Utils.ns.qualify(nameNs);	
		function attrNull() {
			this.removeAttribute(name);
		}
		function attrNullNS() {
			this.removeAttributeNS(name.space, name.local);
		}
		function attrTween(b) {
			return b == null ? attrNull: (b += "", function() {
				var a = this.getAttribute(name), i;
				return a !== b && (i = interpolate(a, b), function(t) {
					//console.log(i, t, i(t));
					this.setAttribute(name, i(t));
				});
			});
		}
		function attrTweenNS(b) {
			return b == null? attrNullNS: (b += "", function() {
				var a = this.getAttributeNS(name.space, name.local), i;
				return a !== b && (i = interpolate(a, b), function(t) {
					this.setAttributeNS(name.space, name.local, i(t));
				});
			})
		}
		latte_transition_tween(this, "attr." + nameNs, value, name.local? attrTweenNS: attrTween);
		return this;
	}
	this.style = function(name, value, priority) {
		var n = arguments.length;
	    if (n < 3) {
	      if (typeof name !== "string") {
	        if (n < 2) value = "";
	        for (priority in name) this.style(priority, name[priority], value);
	        return this;
	      }
	      priority = "";
	    }
	    function styleNull() {
	      this.style.removeProperty(name);
	    }
	    function styleString(b) {
	      return b == null ? styleNull : (b += "", function() {
	        var a = Utils.window(this).getComputedStyle(this, null).getPropertyValue(name), i;
	        return a !== b && (i = latte_interpolate(a, b), function(t) {
	          this.style.setProperty(name, i(t), priority);
	        });
	      });
	    }
	    return latte_transition_tween(this, "style." + name, value, styleString);
	}

	/**
		设置执行时间
	*/
	this.duration = function(value) {
		var id = this.id
			, ns = this.namespace;
		if(arguments.length < 1) return this.node()[ns][id].duration;
		var doFunc;
		if(latte_lib.isFunction(value)) {
			doFunc = function(node, i, j) {
				 node[ns][id].duration = Math.max(1, value.call(node, Utils.getData(node), i, j));
			}
		}else{
			value = Math.max(1, value);
			doFunc =  function(node) {
				node[ns][id].duration = value;
			}
		}
		doFunc.call(this, this.node(), 0, 0);
		return this; 
	}
	/**
		动画缓动

	*/
	this.ease = function(value) {
		var id = this.id, ns = this.namespace;
		if(arguments.length < 1) {
			return this.node()[ns][id].ease;
		}
		if(typeof value !== "function") {
			value = Ease.get(Ease, arguments);	
		}
		(function(node) {
			node[ns][id].ease = value;
		}).call(this, this.node());
		 return this;
	}
	/**
		延迟时间
	*/
	this.delay = function(value) {
		var id = this.id , ns = this.namespace;
		if(arguments.length < 1) return this.node()[ns][id].delay;
		var doFunc;
		if(latte_lib.isFunction(value)) {
			doFunc = function(node, i, j) {
				node[ns][id].delay = Math.max(1, value.call(node, Utils.getData(node), i, j));
			}
		}else{
			value = +value;
			doFunc = function(node) {
				node[ns][id].delay = value;
			}
		}
		doFunc.call(this, this.node(), 0, 0);
		return this;
	}
	
	/**
		@method
		设置时间
		type
	*/
	this.on = function(type, listener) {
		var id = this.id, ns = this.namespace;
		if(arguments.length < 2) {
			var inherit = Transition.latte_transitionInherit
				, inheritId = Transition.latte_transitionInheritId;
		}else{
			(function(node) {
				var Events = latte_lib.events;
	        	var transition = node[ns][id];
	        	(transition.event || (transition.event = new Events())).on(type, listener);
	      	}).call(this, this.node(), 0,0);
		}
		return this;
	}

	this.call = function(callback) {
		var args = Utils.array(arguments);
		callback.apply(args[0] = this, args);
		return this;
	}
}).call(Transition.prototype);
(function() {
	var self = this;
	this.latte_transitionId = 0;
	this.latte_transitionInheritId = null;
	this.latte_transitionNamespace = function(name) {
		return name == null ? "__transition__" : "__transition_" + name + "__";
	}
	var latte_timer = require("./utils/timer.js").timer;
	var Map = require("./utils/map.js");
	this.latte_transitionNode = function(node, i, ns, id, inherit) {
		var lock = node[ns] || (node[ns] = {
	      	active: 0,
	      	count: 0
	    }), transition = lock[id], time, timer, duration, ease, tweens;
	    function schedule(elapsed) {
		      var delay = transition.delay;
		      timer.t = delay + time;
		      if (delay <= elapsed) return start(elapsed - delay);
		      timer.c = start;
		    }
		    function start(elapsed) {
		      var activeId = lock.active, active = lock[activeId];
		      	if (active) {
			        active.timer.c = null;
			        active.timer.t = NaN;
			        --lock.count;
			        delete lock[activeId];
			        //active.event && active.event.interrupt.call(node, Utils.getData(node), active.index);
			      	active.event && active.event.emit("interrupt", Utils.getData(node), active.index);
		      	}
		      for (var cancelId in lock) {
		        if (+cancelId < id) {
		          var cancel = lock[cancelId];
		          cancel.timer.c = null;
		          cancel.timer.t = NaN;
		          --lock.count;
		          delete lock[cancelId];
		        }
		      }
		      timer.c = tick;
		      latte_timer(function() {
		        if (timer.c && tick(elapsed || 1)) {
		          timer.c = null;
		          timer.t = NaN;
		        }
		        return 1;
		      }, 0, time);
		      lock.active = id;
		      //transition.event && transition.event.start.call(node,  Utils.getData(node), i);
		      transition.event && transition.event.emit( "start", Utils.getData(node), i);
		      tweens = [];
		      transition.tween.forEach(function(key, value) {
		        if (value = value.call(node,  Utils.getData(node), i)) {
		          tweens.push(value);
		        }
		      });
		      ease = transition.ease;
		      duration = transition.duration;
		    }
		    function tick(elapsed) {
		      var t = elapsed / duration, e = ease(t), n = tweens.length;
		      while (n > 0) {
		        tweens[--n].call(node, e);
		      }
		      if (t >= 1) {
		        //transition.event && transition.event.end.call(node, Utils.getData(node), i);
		        transition.event && transition.event.emit("end", Utils.getData(node),i);
		        if (--lock.count) delete lock[id]; else delete node[ns];
		        return 1;
		      }
		    }
		    if (!transition) {
		      time = inherit.time;
		      timer = latte_timer(schedule, 0, time);
		      transition = lock[id] = {
		        tween: Map.create(),
		        time: time,
		        timer: timer,
		        delay: inherit.delay,
		        duration: inherit.duration,
		        ease: inherit.ease,
		        index: i
		      };
		      inherit = null;
		      ++lock.count;
		    }
	}
	

	this.create = function(dom, name) {
		var id = self.latte_transitionInheritId || ++self.latte_transitionId,
		ns = self.latte_transitionNamespace(name), 
		subgroups = [], subgroup, node, 
		transition = latte.latte_transitionInherit || {
				time: Date.now(),
		      	ease: Ease.latte_ease_cubicInOut,
		      	delay: 0,
		      	duration: 250
    	};
    	self.latte_transitionNode(dom, 0, ns, id, transition);
		var transition = new Transition(dom);
		transition.id = id;
		transition.namespace = ns;
		return transition;
	}
}).call(Transition);
module.exports = Transition;


});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/v/utils/collection.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
var Collection = function() {
	this._ = Object.create(null);
};
var proto = "__proto__", zero = "\x00";
(function() {
	this.escape = function(key) {
		return (key += "") === proto || key[0] === zero ? zero + key : key;
	}
	this.unescape = function(key) {
		return (key += "")[0] === zero ? key.slice(1) : key;
	}
	var self = this;
	this.keys = function() {
		var keys = [];
	    for (var key in this._) keys.push(self.unescape(key));
	    return keys;
	}
}).call(Collection);
(function() {
	
	this.escape = Collection.escape;
	this.unescape = Collection.unescape;
	this.has = function(key) {
		return this.escape(key) in this._;
	}
	this.remove = function(key) {
		return (key = this.escape(key)) in this._ && delete this._[key];
	}

	this.size = function() {
		var size = 0;
		for(var key in this._) {
			++size;
		}
		return size;
	}
	this.empty = function() {
		for(var key in this._) {
			return false;
		}
		return true;
	}
}).call(Collection.prototype);

module.exports = Collection;
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/v/utils/color.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
var Color = function() {

};
(function() {
	this.toString = function() {
		return this.rgb() + "";
	}
}).call(Color.prototype);
module.exports = {
	color: Color
};
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/v/utils/index.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
(function() {
	var latte_vendorPrefixes = [ "webkit", "ms", "moz", "Moz", "o", "O" ];
	this.latte_vendorSymbol = function(object, name) {
	    if (name in object) return name;
	    name = name.charAt(0).toUpperCase() + name.slice(1);
	    for (var i = 0, n = latte_vendorPrefixes.length; i < n; ++i) {
	      var prefixName = latte_vendorPrefixes[i] + name;
	      if (prefixName in object) return prefixName;
	    }
  	}
}).call(module.exports);
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/v/utils/map.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
(function() {
	var latte_lib = require("latte_lib");
	var Map  =  (function() {
		var Collection = require("./collection.js");
		var Map = function() {
			this._ = Object.create(null);
		};
		var latte_map_proto = "__proto__"
			, latte_map_zero = "\x00";
		latte_lib.inherits(Map, Collection);
		(function() {
			this.get = function(key) {
				return this._[this.escape(key)];
			}
			this.set = function(key, value) {
				return this._[this.escape(key)] = value;
			}
			this.remove = function(key) {
				return (key = this.escape(key)) in this._ && delete this._[key];
			}
			this.keys = Collection.keys;
			this.values = function() {
				var values = [];
				for(var key in this._) values.push(this._[key]);
					return values;
			}
			this.entries = function() {
				var entries = [];
				for(var key in this._) entries.push({
					key: this.unescape(key),
					value: this._[key]
				});
				return entries;
			}
			this.forEach = function(f) {
				var self = this;
				for (var key in this._) {
					f.call(this, this.unescape(key), this._[key]);
				}				
			}
		}).call(Map.prototype);
		return Map;
	})();
	this.create = function(object, f) {
		var map = new Map();
			if(object instanceof Map) {
				object.forEach(function(key, value) {
					map.set(key, value);
				});
			}else if(Array.isArray(object)) {
				var i = -1, n = object.length, o;
	      		if (arguments.length === 1) while (++i < n) map.set(i, object[i]); else while (++i < n) map.set(f.call(object, o = object[i], i), o); 
			}else{
				for(var key in object) map.set(key, object[key]);
			}
			return map;
	}
}).call(module.exports);
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/v/utils/rgb.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
var Map = require("./map.js");
var rgbNames = {
    aliceblue: 15792383,
    antiquewhite: 16444375,
    aqua: 65535,
    aquamarine: 8388564,
    azure: 15794175,
    beige: 16119260,
    bisque: 16770244,
    black: 0,
    blanchedalmond: 16772045,
    blue: 255,
    blueviolet: 9055202,
    brown: 10824234,
    burlywood: 14596231,
    cadetblue: 6266528,
    chartreuse: 8388352,
    chocolate: 13789470,
    coral: 16744272,
    cornflowerblue: 6591981,
    cornsilk: 16775388,
    crimson: 14423100,
    cyan: 65535,
    darkblue: 139,
    darkcyan: 35723,
    darkgoldenrod: 12092939,
    darkgray: 11119017,
    darkgreen: 25600,
    darkgrey: 11119017,
    darkkhaki: 12433259,
    darkmagenta: 9109643,
    darkolivegreen: 5597999,
    darkorange: 16747520,
    darkorchid: 10040012,
    darkred: 9109504,
    darksalmon: 15308410,
    darkseagreen: 9419919,
    darkslateblue: 4734347,
    darkslategray: 3100495,
    darkslategrey: 3100495,
    darkturquoise: 52945,
    darkviolet: 9699539,
    deeppink: 16716947,
    deepskyblue: 49151,
    dimgray: 6908265,
    dimgrey: 6908265,
    dodgerblue: 2003199,
    firebrick: 11674146,
    floralwhite: 16775920,
    forestgreen: 2263842,
    fuchsia: 16711935,
    gainsboro: 14474460,
    ghostwhite: 16316671,
    gold: 16766720,
    goldenrod: 14329120,
    gray: 8421504,
    green: 32768,
    greenyellow: 11403055,
    grey: 8421504,
    honeydew: 15794160,
    hotpink: 16738740,
    indianred: 13458524,
    indigo: 4915330,
    ivory: 16777200,
    khaki: 15787660,
    lavender: 15132410,
    lavenderblush: 16773365,
    lawngreen: 8190976,
    lemonchiffon: 16775885,
    lightblue: 11393254,
    lightcoral: 15761536,
    lightcyan: 14745599,
    lightgoldenrodyellow: 16448210,
    lightgray: 13882323,
    lightgreen: 9498256,
    lightgrey: 13882323,
    lightpink: 16758465,
    lightsalmon: 16752762,
    lightseagreen: 2142890,
    lightskyblue: 8900346,
    lightslategray: 7833753,
    lightslategrey: 7833753,
    lightsteelblue: 11584734,
    lightyellow: 16777184,
    lime: 65280,
    limegreen: 3329330,
    linen: 16445670,
    magenta: 16711935,
    maroon: 8388608,
    mediumaquamarine: 6737322,
    mediumblue: 205,
    mediumorchid: 12211667,
    mediumpurple: 9662683,
    mediumseagreen: 3978097,
    mediumslateblue: 8087790,
    mediumspringgreen: 64154,
    mediumturquoise: 4772300,
    mediumvioletred: 13047173,
    midnightblue: 1644912,
    mintcream: 16121850,
    mistyrose: 16770273,
    moccasin: 16770229,
    navajowhite: 16768685,
    navy: 128,
    oldlace: 16643558,
    olive: 8421376,
    olivedrab: 7048739,
    orange: 16753920,
    orangered: 16729344,
    orchid: 14315734,
    palegoldenrod: 15657130,
    palegreen: 10025880,
    paleturquoise: 11529966,
    palevioletred: 14381203,
    papayawhip: 16773077,
    peachpuff: 16767673,
    peru: 13468991,
    pink: 16761035,
    plum: 14524637,
    powderblue: 11591910,
    purple: 8388736,
    rebeccapurple: 6697881,
    red: 16711680,
    rosybrown: 12357519,
    royalblue: 4286945,
    saddlebrown: 9127187,
    salmon: 16416882,
    sandybrown: 16032864,
    seagreen: 3050327,
    seashell: 16774638,
    sienna: 10506797,
    silver: 12632256,
    skyblue: 8900331,
    slateblue: 6970061,
    slategray: 7372944,
    slategrey: 7372944,
    snow: 16775930,
    springgreen: 65407,
    steelblue: 4620980,
    tan: 13808780,
    teal: 32896,
    thistle: 14204888,
    tomato: 16737095,
    turquoise: 4251856,
    violet: 15631086,
    wheat: 16113331,
    white: 16777215,
    whitesmoke: 16119285,
    yellow: 16776960,
    yellowgreen: 10145074
  };
  var rgbs =  Map.create();

        function latte_rgb(r, g, b) {
            return this instanceof latte_rgb ? void (this.r = ~~r, this.g = ~~g, this.b = ~~b) : 
            arguments.length < 2 ?
             r instanceof latte_rgb ? new latte_rgb(r.r, r.g, r.b) : 
             latte_rgb_parse("" + r, latte_rgb, latte_hsl_rgb) : new latte_rgb(r, g, b);
        }
    function latte_hsl_rgb(h, s, l) {
        var m1, m2;
        h = isNaN(h) ? 0 : (h %= 360) < 0 ? h + 360 : h;
        s = isNaN(s) ? 0 : s < 0 ? 0 : s > 1 ? 1 : s;
        l = l < 0 ? 0 : l > 1 ? 1 : l;
        m2 = l <= .5 ? l * (1 + s) : l + s - l * s;
        m1 = 2 * l - m2;
        function v(h) {
          if (h > 360) h -= 360; else if (h < 0) h += 360;
          if (h < 60) return m1 + (m2 - m1) * h / 60;
          if (h < 180) return m2;
          if (h < 240) return m1 + (m2 - m1) * (240 - h) / 60;
          return m1;
        }
        function vv(h) {
          return Math.round(v(h) * 255);
        }
        return new d3_rgb(vv(h + 120), vv(h), vv(h - 120));
    }
        function latte_rgb_parseNumber(c) {
            var f = parseFloat(c);
            return c.charAt(c.length - 1) === "%" ? Math.round(f * 2.55) : f;
        }
    function latte_rgb_parse(format, rgb, hsl) {
        var r = 0, g = 0, b = 0, m1, m2, color;
        m1 = /([a-z]+)\((.*)\)/.exec(format = format.toLowerCase());
        if (m1) {
          m2 = m1[2].split(",");
          switch (m1[1]) {
           case "hsl":
            {
              return hsl(parseFloat(m2[0]), parseFloat(m2[1]) / 100, parseFloat(m2[2]) / 100);
            }

           case "rgb":
            {
                return rgb(latte_rgb_parseNumber(m2[0]), latte_rgb_parseNumber(m2[1]), latte_rgb_parseNumber(m2[2]));
            }
          }
        }
        if (color = rgbs.get(format)) {
            return rgb(color.r, color.g, color.b);
        }
        if (format != null && format.charAt(0) === "#" && !isNaN(color = parseInt(format.slice(1), 16))) {
          if (format.length === 4) {
            r = (color & 3840) >> 4;
            r = r >> 4 | r;
            g = color & 240;
            g = g >> 4 | g;
            b = color & 15;
            b = b << 4 | b;
          } else if (format.length === 7) {
            r = (color & 16711680) >> 16;
            g = (color & 65280) >> 8;
            b = color & 255;
          }
        }
        return rgb(r, g, b);
    }
    function latte_rgbString(value) {
        return latte_rgbNumber(value) + "";
    }
    function latte_rgbNumber(value) {
        return new latte_rgb(value >> 16, value >> 8 & 255, value & 255);
    }
for(var key in rgbNames) {
	var value = rgbNames[key];
	rgbs.set(key, latte_rgbNumber(value));
}

function latte_rgb_hex(v) {
    return v < 16 ? "0" + Math.max(0, v).toString(16) : Math.min(255, v).toString(16);
}
module.exports = {
	rgbs : rgbs,
	rgb : latte_rgb,
    rgb_hex: latte_rgb_hex
};
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/v/utils/timer.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
(function() {
		var latte_timer_queueHead
		, latte_timer_queueTail
		, latte_timer_interval
		, latte_timer_timeout
		, latte_vendorSymbol = require("./index.js").latte_vendorSymbol
		, latte_timer_frame = window[latte_vendorSymbol(window, "requestAnimationFrame")] || function(callback) {
			setTimeout(callback, 1000/60 );
		};
		function latte_timer_mark() {
			var now = Date.now() , timer = latte_timer_queueHead;
			while(timer) {
				if(now >= timer.t && timer.c(now - timer.t)) {
					timer.c = null;
				}
				timer = timer.n;
			}
			return now;
		};
	 	function latte_timer_sweep() {
			var t0, t1 = latte_timer_queueHead, time = Infinity;
			while(t1) {
				if(t1.c) {
					if(t1.t < time) time = t1.t;
					t1 = (t0 = t1).n;
				}else{
					t1 = t0? t0.n = t1.n: latte_timer_queueHead = t1.n;
				}
			}
			latte_timer_queueTail = t0;
			return time;
		};
		function latte_timer_step () {
			var now = latte_timer_mark(), delay = latte_timer_sweep() - now;
			if(delay > 24) {
				if(isFinite(delay)) {
					clearTimeout(latte_timer_timeout);
					latte_timer_timeout = setTimeout(latte_timer_step, delay);
				}
				latte_timer_interval = 0;
			}else{
				latte_timer_interval = 1;
				latte_timer_frame(latte_timer_step);
			}
		};
	var Timer = function(callback, delay, then) {
		var n = arguments.length;	
		if(n < 2) delay = 0;
		if(n < 3) then = Date.now();
		var time = then + delay, timer = {
			c: callback,
			t: time,
			n: null
		};
		if(latte_timer_queueTail) {
			latte_timer_queueTail.n = timer;
		}else{
			latte_timer_queueHead = timer;
		}
		latte_timer_queueTail = timer;
		if(!latte_timer_interval) {
			latte_timer_timeout = clearTimeout(latte_timer_timeout);
			latte_timer_interval = 1;
			latte_timer_frame(latte_timer_step);
		}
		return timer;
	};
	this.timer = function() {
		return Timer.apply(this, arguments);
	}
	this.timer.flush = function() {
		latte_timer_mark();
		latte_timer_sweep();
	}
}).call(module.exports);
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/v/view.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
(function() {
	var Utils = require("./viewUtils.js")
		, latte_lib = require("latte_lib");
	var View = function(dom) {
		this.dom = dom;
	};
	(function() {
		this.attrs = function() {
			
		}
		/**
			@attr 
			@param name String or Object
			@param value String 
			@return   String or View
			@example
				var View = require("latte_dom").create;
				var view = View("css select");
				view.attr("width", 100);

		*/

		this.attr = function(name, value) {
			if(arguments.length < 2) {
				if(latte_lib.isString(name)) {
					return Utils.getAttr.call(this.node(), name);
				}
				for(value in name) {
					Utils.attr(value, name[value]).call(this.node(), this.getData());
				}
				return this;
			}
			Utils.attr(name, value).call(this.node(), this.getData());
			return this;
		}
		
		/**
			@attr 
			@param name String or Object
			@param value String 
			@return   Boolean or View
			@example
				var View = require("latte_dom").create;
				var view = View("css select");
				view.classed("latte_input", true);
		*/
		this.classed = function(name, value) {
			if(arguments.length < 2) {
				if(latte_lib.isString(name)) {
					var node = this.node(),
						n = (name = Utils.split_classes(name)).length, 
						i = -1;
					if(value = node.classList) {
						while(++i < n) {
							if(!value.contains(name[i])) {
								return false;
							}
						} 	
					}else{
						value = Utils.getAttr("class").call(node, this.getData());
						while(++i < n) {
							if(!Utils.classedRe(name[i]).test(value)) {
								return false;
							}
						}
					}
					return true;
				}
				for(value in name) {
					Utils.classed(value, name[value]).call(this.node(), this.getData());
				}
				return this;
			}
			Utils.classed(name, value).call(this.node());
			return this;
		}
		/**
			@method style 
			@param name String or Object
			@param value String 
			@param priority
			@return   Boolean or View
			@example
				var View = require("latte_dom").create;
				var view = View("css select");
				view.classed("latte_input", true);
		*/
		this.style = function(name, value, priority) {
			var n = arguments.length;
			if(n < 3) {
				if(!latte_lib.isString(name)) {
					if( n < 2) value = "";
					for(priority in name) {
						Utils.style(priority, name[priority], value).call(this.node(), this.getData());
						
					}
					return this;
				}
				if(n < 2) {
					var node = this.node();
					return Utils.window(node).getComputedStyle(node, null).getPropertyValue(name);
				}
				priority = "";
				
			}
			Utils.style(name, value, priority).call(this.node(), this.getData());
			return this;
		}
		/**
			@method text
			@param value
			@return String or Views
		*/
		this.text = function(value) {
			if(arguments.length) {
				var func ;
				if(latte_lib.isFunction(value)) {
					func = function() {
						var v = value.apply(this, arguments);
						this.textContent = v = null ? "" : v;
					}
				}else if(value == null) {
					func = function() {
						this.textContent = "";
					}
				}else{
					func = function() {
						this.textContent = value;
					}
				}
				func.call(this.node(), this.getData());
				return this;
			}else{
				return this.node().textContent;
			}
		}
		this.value = function(value) {
			if(arguments.length) {
				var func;
				if(latte_lib.isFunction(value)) {
					func = function() {
						var v = value.apply(this, arguments);
						this.value = v = null? "": v;
					}
				}else if(value == null) {
					func = function() {
						this.value = "";
					}
				}else {
					func = function() {
						this.value = value;
					}
				}
				func.call(this.node(), this.getData());
				return this;
			}else{
				return this.node().value;
			}
		}
		/**
			@method html
			@param value
			@return String or Views
		*/
		this.html = function(value) {
			if(arguments.length) {
				var func ;
				if(latte_lib.isFunction(value)) {
					func = function() {
						var v = value.apply(this, arguments);
						this.innerHTML = v = null ? "" : v;
					}
				}else if(value == null) {
					func = function() {
						this.innerHTML = "";
					}
				}else{
					func = function() {
						this.innerHTML = value;
					}
				}
				func.call(this.node(), this.getData());
				return this;
			}else{
				return this.node().innerHTML;
			}
		}
		/**
			@method on
			@param type  String
			@param listener  Function
			@param capture  Boolean
			@return View or Function
		*/
		this.on = function(type, listener, capture) {
			var n = arguments.length;
			if(n < 3) {
				if(!latte_lib.isString(type)) {
					if(n < 2) listener = false;
					for(capture in type) {
						Utils.on(capture, type[capture], listener);
					}
					return this;
				}
				if(n < 2) {
					return (n = this.node()["__on" + type]) && n.map(function(o) {
						return o._;
					});
				}
				capture = false;
			}
		 	Utils.on( type, listener, capture).call(this.node(), this.getData());
			return this;
		}
			var onceFunc = function(type, listener,capture, self) {
				var once = function() {
					var args = Utils.array(arguments);
					listener.call(this, args);
					self.off(type, once, capture);
				};
				return once;
			}
		/**
			@method off
			@param type  String
			@param listener  Function
			@param capture  Boolean
			@return View or Function
		*/
		this.off = function(type, listener, capture) {
			var n = arguments.length;
			if(n < 3) {
				if(!latte_lib.isString(type)) {
					if(n < 2 ) listener = false;
					var self = this;
					for(var capture in type) {
						Utils.off(capture, type[capture], listener).call(this.node(), this.getData());
					}
					return this;
				}
				if(n < 2) {
					return false;
				}
				capture = false;
			}
			Utils.off(type, listener, capture).call(this.node(), this.getData());
			return this;
		}
		/**
			@method once
			@param type  String
			@param listener  Function
			@param capture  Boolean
			@return View or Function
		*/
		this.once = function(type, listener, capture) {
			var n = arguments.length;
			if(n < 3) {
				if(!latte_lib.isString(type)) {
					if(n < 2) listener = false;
					var self = this;
					for(var capture in type) {
						Utils.on(capture, onceFunc(capture, type[capture], listener, self), listener);
					}
					return this;
				}
				if(n < 2) {
					return false;
				}
				capture = false;
			}
			Utils.on(type, onceFunc(type, listener ,capture, this), capture).call(this.node(), this.getData());
			return this;
		}

		this.transition = function(name) {
			var Transition = require("./transition.js");
			/**
			var id = Transition.latte_transitionInheritId || ++Transition.latte_transitionId,
			ns = Transition.latte_transitionNamespace(name), 
			subgroups = [], subgroup, node, 
			transition = Transition.latte_transitionInherit || {
					time: Date.now(),
			      	ease: latte_ease_cubicInOut,
			      	delay: 0,
			      	duration: 250
	    	};
	    	var dom = this.node();
	    	Transition.latte_transitionNode(dom, 0, ns, id, transition);
	    	*/
	    	return Transition.create(this.node(), name);
		}
		this.getData = function() {
			return Utils.getData(this.node());
		}

		this.node = function() {
			return this.dom;
		}
		Object.defineProperty(this, "children" , {
			get: function() {
				return this.dom.children;
			}
		});
		Object.defineProperty(this, "childNodes", {
			get: function() {
				return this.dom.childNodes;
			}
		});
		Object.defineProperty(this, "value", {
			get: function() {
				return this.dom.value;
			},
			set : function(value) {
				this.dom.value = value;
			}
		});
		
		this.insertBefore = function(o) {
			return this.dom.insertBefore(o);
		}
		this.appendChild = function(o) {
			return this.dom.appendChild(o);
		}
		this.removeChild =  function(o) {
			return this.dom.removeChild(o);
		}
		this.removeAll = function() {
			this.dom.innerHTML = "";
		}
		
	}).call(View.prototype);
	this.create = function(dom) {
		if(latte_lib.isString(dom)) {
			dom = Utils.select(dom, document);
		}
		return new View(dom);
	}
}).call(module.exports);
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_dom/v/viewUtils.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {
(function() {
	var self = this;
		var latte_arraySlice = [].slice;
		this.arraySlice = latte_arraySlice;
		this.array = function(list) {
			return latte_arraySlice.call(list);
		}
		var latte_nsPrefix = {
		    svg: "http://www.w3.org/2000/svg",
		    xhtml: "http://www.w3.org/1999/xhtml",
		    xlink: "http://www.w3.org/1999/xlink",
		    xml: "http://www.w3.org/XML/1998/namespace",
		    xmlns: "http://www.w3.org/2000/xmlns/"
	  	};
	  	this.ns = {
		    prefix: latte_nsPrefix,
		    qualify: function(name) {
		      var i = name.indexOf(":"), prefix = name;
		      if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
		      return latte_nsPrefix.hasOwnProperty(prefix) ? {
		        space: latte_nsPrefix[prefix],
		        local: name
		      } : name;
		    }
	  	};
	this.window = function(node) {
    	return node && (node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView);
  	}
		var collapse = this.collapse =function(s) {
	    	return s.trim().replace(/\s+/g, " ");
	  	}
		var classedName = this.classedName = function (name) {
		    var re = self.classedRe(name);
		    return function(node, value) {
		      if (c = node.classList) return value ? c.add(name) : c.remove(name);
		      var c = node.getAttribute("class") || "";
		      if (value) {
		        re.lastIndex = 0;
		        if (!re.test(c)) node.setAttribute("class", self.collapse(c + " " + name));
		      } else {
		        node.setAttribute("class", self.collapse(c.replace(re, " ")));
		      }
		    };
		}
		var requote_re = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;
		this.requote = function(s) {
	    	return s.replace(requote_re, "\\$&");
	  	};
		this.classedRe = function(name) {
	   		return new RegExp("(?:^|\\s+)" + self.requote(name) + "(?:\\s+|$)", "g");
	  	}
		this.split_classes = function(name) {
			return (name + "").trim().split(/^|\s+/);
		}
	this.classed = function(name, value) {
		name = self.split_classes(name).map(self.classedName);
		var n = name.length;
		function classedConstant() {
	      var i = -1;
	      while (++i < n) name[i](this, value);
	    }
	    function classedFunction() {
	      var i = -1, x = value.apply(this, arguments);
	      while (++i < n) name[i](this, x);
	    }
	    return typeof value === "function" ? classedFunction : classedConstant;
	} 
	

	this.style = function(name, value, priority) {
		function styleNull() {
	      	this.style.removeProperty(name);
	    }
	    function styleConstant() {
	      this.style.setProperty(name, value, priority);
	    }
	    function styleFunction() {
	      	var x = value.apply(this, arguments);
	      	if (x == null) this.style.removeProperty(name); else this.style.setProperty(name, x, priority);
	    }
	    return value == null ? styleNull : typeof value === "function" ? styleFunction : styleConstant;
	}
	this.getAttr = function(name) {
		name = self.ns.qualify(name);
		return name.local? this.getAttributeNS(name.space, name.local) : this.getAttribute(name);
	}
	this.attr = function(name, value) {
		name = self.ns.qualify(name);
		function attrNull() {
	      this.removeAttribute(name);
	    }
	    function attrNullNS() {
	      this.removeAttributeNS(name.space, name.local);
	    }
	    function attrConstant() {
	      this.setAttribute(name, value);
	    }
	    function attrConstantNS() {
	      this.setAttributeNS(name.space, name.local, value);
	    }
	    function attrFunction() {
	      var x = value.apply(this, arguments);
	      if (x == null) this.removeAttribute(name); else this.setAttribute(name, x);
	    }
	    function attrFunctionNS() {
	      var x = value.apply(this, arguments);
	      if (x == null) this.removeAttributeNS(name.space, name.local); else this.setAttributeNS(name.space, name.local, x);
	    }
		return  value == null ? 
			name.local ? attrNullNS : attrNull 
			: 
			typeof value === "function" ?  
					name.local ? attrFunctionNS : attrFunction 
			: name.local ? attrConstantNS : attrConstant;
	}
		this.event = null;
		var onListener = function(listener, argumentz) {
			return function(e) {
				var o = self.event;
				self.event = e;
				argumentz[0] = self.getData(this);
				try {
					listener.apply(this, argumentz);
				}catch(e) {
					//console.log(e);
					throw e;
				}finally {
					self.event = o;
				}
			}
		}
		var Map = require("./utils/map.js");
		var onFilters = Map.create({
			mouseenter: "mouseover",
		    mouseleave: "mouseout"
		});

		this.getData = function(dom) {
			return dom.controller && dom.controller.data || dom.__data__;
		}
		var onFilter = function(listener, argumentz) {
			var l = onListener(listener, argumentz);
			return function(e) {
				var target = this, related = e.relatedTarget;
				if (!related || related !== target && !(related.compareDocumentPosition(target) & 8)) {
		        	l.call(target, e);
		      	}
			}
		}
	
	this.off = function(type, listener, capture) {
		var name = "__on" + type, i = type.indexOf(".");
		if(i > 0) {
			type = type.slice(0, i);
		}
		function onRemove() {
			var l = this[name];
			if(l) {
				var _self = this;
				l.forEach(function(o) {

					if(o._ == listener && o.$ == capture) {
						var index = l.indexOf(o);
						l.splice(index, 1);
						_self.removeEventListener(type, o, capture);
					}
				});

			}
		}
		return onRemove;
	}

	this.on = function(type, listener, capture) {
		var name = "__on" + type, i = type.indexOf("."),
			wrap = onListener;
		if(i > 0) {
			type = type.slice(0, i);
		}
		var filter = onFilters.get(type);
		if(filter) {
			type = filter;
			wrap = onFilter;
		}
		function onRemove() {
			var l = this[name];
			if(l) {
				var _self = this;
				l.forEach(function(o) {
					_self.removeEventListener(type, o, o.$);
				});
				delete this[name];
			}
		}
		function onAdd() {
			var l = wrap(listener, self.array(arguments));
			//onRemove.call(this);
			this.addEventListener(type,  l, l.$ = capture);
			this[name] = this[name] || [];
			l._ = listener;
			this[name].push(l);
		}
		function removeAll() {
			var re = new RegExp("^__on[^.]+)" + self.requote(type) + "$"), match;
			for(var name in this) {
				if(match = name.match(re)) {
					var l = this[name];
					var self = this;
					l.forEach(function(o) {
						self.removeEventListener(match[1], o, o.$);
					});
					delete this[name];
				}
			}
		}
		return i ? listener ? onAdd: onRemove : listener? latte_noop: removeAll;
	}
			
			function latte_interpolateArray(a, b) {
			    var x = [], c = [], na = a.length, nb = b.length, n0 = Math.min(a.length, b.length), i;
			    for (i = 0; i < n0; ++i) x.push(latte_interpolate(a[i], b[i]));
			    for (;i < na; ++i) c[i] = a[i];
			    for (;i < nb; ++i) c[i] = b[i];
			    return function(t) {
			      for (i = 0; i < n0; ++i) c[i] = x[i](t);
			      return c;
			    };
		  	}
	  		var latte_interpolateObject = function(a, b) {
			    var i = {}, c = {}, k;
			    for (k in a) {
			      if (k in b) {
			        i[k] = latte_interpolate(a[k], b[k]);
			      } else {
			        c[k] = a[k];
			      }
			    }
			    for (k in b) {
			      if (!(k in a)) {
			        c[k] = b[k];
			      }
			    }
			    return function(t) {
			      for (k in i) c[k] = i[k](t);
			      return c;
			    };
		  	}
		  	var latte_interpolateNumber = function(a, b) {
				a = +a, b = +b;

				return function(t) {
					return a * (1 - t) + b * t;
				};
			}
			var latte_interpolate_numberA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, 
		  			latte_interpolate_numberB = new RegExp(latte_interpolate_numberA.source, "g");
			var latte_interpolateString = function(a,b) {
				var bi = latte_interpolate_numberA.lastIndex = latte_interpolate_numberB.lastIndex = 0, am, bm, bs, i = -1, s = [], q = [];
				    a = a + "", b = b + "";
				    while ((am = latte_interpolate_numberA.exec(a)) && (bm = latte_interpolate_numberB.exec(b))) {
						if ((bs = bm.index) > bi) {
							bs = b.slice(bi, bs);
							if (s[i]) s[i] += bs; else s[++i] = bs;
						}
				      	if ((am = am[0]) === (bm = bm[0])) {
				        	if (s[i]) s[i] += bm; else s[++i] = bm;
				      	} else {
				        	s[++i] = null;
				        	q.push({
				          		i: i,
				          		x: latte_interpolateNumber(am, bm)
			        		});
				      	}
				      	bi = latte_interpolate_numberB.lastIndex;
				    }
				    if (bi < b.length) {
				      	bs = b.slice(bi);
				      	if (s[i]) s[i] += bs; else s[++i] = bs;
				    }
				    return s.length < 2 ? q[0] ? (b = q[0].x, function(t) {
				      	return b(t) + "";
				    }) : function() {
				      	return b;
				    } : (b = q.length, function(t) {
				      	for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
				      		return s.join("");
				    });
			}
			var Rgb = require("./utils/rgb.js");
			var latte_rgb_hex= Rgb.rgb_hex;
			var latte_interpolateRgb = function(a, b) {
	  			a = Rgb.rgb(a);
			    b = Rgb.rgb(b);
			    var ar = a.r, ag = a.g, ab = a.b, br = b.r - ar, bg = b.g - ag, bb = b.b - ab;
			    return function(t) {
			      	return "#" + latte_rgb_hex(Math.round(ar + br * t)) + latte_rgb_hex(Math.round(ag + bg * t)) + latte_rgb_hex(Math.round(ab + bb * t));
			    };
	  		}
	  		var Color = require("./utils/color.js").color;
	  		var RgbNames = Rgb.rgbs;
		var interpolators = [ function(a, b) {
		    var t = typeof b;
		    return (t === "string" ? 
		    	RgbNames.has(b.toLowerCase()) || 
		    	/^(#|rgb\(|hsl\()/i.test(b) ? 
		    		latte_interpolateRgb : latte_interpolateString 
		    		: b instanceof Color ? 
		    		latte_interpolateRgb : Array.isArray(b) ? 
		    		latte_interpolateArray : t === "object" 
		    		&& isNaN(b) ? latte_interpolateObject : 
		    		latte_interpolateNumber)(a, b);
	  	} ];
	/**
		transition
	*/
  	var latte_interpolate = this.latte_interpolate = function(a, b) {
  		var i = interpolators.length, f;
			while (--i >= 0 && !(f = interpolators[i](a, b))) ;
		return f;
  	}
	this.select = function(name, node) {
		return node.querySelector(name);
	}
	this.selectAll = function(name, node) {
		return node.querySelectorAll(name);
	}
}).call(module.exports);
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });