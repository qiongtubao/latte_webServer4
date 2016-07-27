	var latte_watch = require("latte_watch")
		, Modules = require("latte_require")
		, latte_lib = require("latte_lib");
	var defaultConfig = {
		
		reloadTime: 3 * 1000
	}
	var Load = function(config) {
		this.config = latte_lib.merger(defaultConfig,config);
		this.require = null;
		this.start();
	};
	latte_lib.inherits(Load, latte_lib.events);
	(function() {
		this.start = function() {
			this.require = Modules.create("./");
			if(!this.config.loadPath) {
				return;
			}
			this.loadDir(this.config.loadPath);
			var self = this;
			
			var watcher = this.watcher = latte_watch.create(this.config.loadPath);
			watcher.on("addDir", function(addDirName) {
				self.loadDir(addDirName);
			});
			watcher.on("unlink", function() {
				self.reload({
					event: "unlink"
				});
			});
			watcher.on("unlinkDir", function() {
				self.reload({
					event: "unlinkDir"
				});
			});
			watcher.on("add", function(filename) {
				self.loadFile(filename);
			});
			watcher.on("change", function() {
				self.reload({
					event: "fileChange"
				});
			});	
		}
		this.loadDir = function(path) {
			var self = this;
			var files = latte_lib.fs.readdirSync(path);
			files.forEach(function(filename) {
				var stat = latte_lib.fs.statSync(path + "/" + filename);
				if(stat.isFile()) {
					self.loadFile(path + "/" + filename);
				}else if(stat.isDirectory()) {
					self.loadDir(path + "/" + filename);
				}
			});	
		}
		this.loadFile = function(path) {
			var self = this;
			var o;
			try {
				o = self.require.require("./" + path);
			}catch(err) {
				self.emit("loadError");
				return;
			}
			this.load(o);
		}
		this.reload = function(event) {
			
			this.reloadList = this.reloadList || [];
			this.reloadList.push(event);
			if(this.reloadList.length > 1) {
				return;
			}
			var self = this;
			setTimeout(function() {
				console.log("reload");
				self.require = Modules.create("./");
				self.clean();
				self.loadDir(self.config.loadPath);
				
				self.emit("reload");
				
				self.reloadList = [];
			}, self.config.reloadTime);
			//console.log(self.config.reloadTime);
		}
		this.clean = function() {
			this.methods = {};
		}
		/**
			虚函数
		*/
		this.load = function() {

		}
	}).call(Load.prototype);
	module.exports = Load;
