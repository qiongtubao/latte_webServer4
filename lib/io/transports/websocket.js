(function(define) { 'use strict';
	define("latte_web/io/transports/websocket", ["require", "exports", "module", "window"],
	function(require, exports, module, window) {
		var latte_lib = require("latte_lib");
		var Transport = require("../transport")
			, parser = require("../parser");
		module.exports = WebSocket;
		function WebSocket(req) {
			Transport.call(this, req);
			var self = this;
			this.socket = req.websocket;
			this.socket.on("message", this.onData.bind(this));
			this.socket.once("close", this.onClose.bind(this));
			this.socket.on("error", this.onError.bind(this));
			this.socket.on("headers", function(headers) {
				self.emit("headers", headers);
			});
			this.writable = true;
		};
		latte_lib.inherits(WebSocket, Transport);
		(function() {
			this.name = "websocket";
			this.handlesUpgrades = true;
			this.supportsFraming = true;
			this.onData = function(data) {
				Transport.prototype.onData.call(this, data);
			}
			this.send = function(packets) {
				var self = this;
				for(var i = 0, l = packets.length ; i < l ; i++) {
					parser.encodePacket(packets[i], this.supportsBinary, function(data) {
						self.writable = false;
						self.socket.send(data, function(err) {
							if(err) return self.onError("write error", err.stack);
							self.writable = true;
							self.emit("drain");
 						});
					});
				}
			}
			this.doClose = function(fn) {
				this.socket.close();
				fn && fn();
			}
		}).call(WebSocket.prototype);
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
