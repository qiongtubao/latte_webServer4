(function(define) { 'use strict';
	define("latte_web/io/transports/polling", ["require", "exports", "module", "window"],
	function(require, exports, module, window) {
		var latte_lib = require("latte_lib");
		var Transport = require("../transport")
			, parser = require("../parser");
		module.exports = Polling;
		function Polling(req) {
			Transport.call(this, req);
		}
		latte_lib.inherits(Polling, Transport);
		(function() {
			this.name = "polling";
			this.onRequest = function(req) {
				var res = req.res;

				if ('GET' == req.method) {
					this.onPollRequest(req, res);
				} else if ('POST' == req.method) {
					this.onDataRequest(req, res);
				} else {
					res.writeHead(500);
					res.end();
				}
			}
			this.onPollRequest = function(req, res) {
				if(this.req) {
					this.onError("overlap from client");
					res.writeHead(500);
					return;
				}
				this.req = req;
				this.res = res;
				var self = this;
				function onClose() {
					self.onError("poll connection closed prematurely");
				}
				function cleanup() {
					req.removeListener("close", onClose);
					self.req =  self.res = null;
				}
				req.cleanup = cleanup;
				req.on("close", onClose);

				this.writable = true;
				this.emit("drain");

				if(this.writable && this.shouldClose) {
					this.send([{type: "noop"}]);
				}
			}
			this.onDataRequest = function(req, res) {
				if(this.dataReq) {
					this.onError("data request overlap from client");
					this.writeHead(500);
					return;
				}
				var isBinary = "application/octet-stream" == req.headers["content-type"];

				this.dataReq = req;
				this.dataRes = res;

				var chunks = isBinary ? new Buffer(0): "";
				var self = this;
				function cleanup() {
					chunks = isBinary ? new Buffer(0): "";
					req.removeListener("data", onData);
					req.removeListener("end", onEnd);
					req.removeListener("close", onClose);
					self.dataReq = self.dataRes = null;
				}

				function onClose() {
					cleanup();
					self.onError("data request connection closed ")
				}

				function onData(data) {
					var contentLength;
					if(typeof data == "string") {
						chunks += data;
						contentLength = Buffer.byteLength(chunks);
					} else {
						chunks = Buffer.concat([chunks, data]);
						contentLength = chunks.length;
					}
					if(contentLength > self.maxHttpBufferSize) {
						chunks = "";
						req.connection.destroy();
					}
				}

				function onEnd() {
					self.onData(chunks);
					var headers = {
						"Content-Type": "text/html",
						"Content-Length" : 2
					};
					var ua = req.headers["user-agent"];
					if (ua && (~ua.indexOf(';MSIE') || ~ua.indexOf('Trident/'))) {
				      headers['X-XSS-Protection'] = '0';
				    }
				    res.writeHead(200, self.headers(req, headers));
				    res.end("ok");
				    cleanup();
				}
				req.on("close", onClose);
				req.on("data", onData);
				req.on("end", onEnd);
				if(!isBinary) req.setEncoding("utf8");
			}
			this.onData = function(data) {
				var self = this;
				var callback = function(packet) {
					if("close" == packet.type) {
						self.onClose();
						return false;
					}
					self.onPacket(packet);
				}
				parser.decodePayload(data, callback);
			}

			this.onClose = function() {
				if(this.writable) {
					this.send([{ type: "noop"}]);
				}
				Transport.prototype.onClose.call(this);
			}

			this.send = function(packets) {
				if(this.shouldClose) {
					packets.push({ type: "close"});
					this.shouldClose();
					this.shouldClose = null;
				}
				var self = this;
				parser.encodePayload(packets, this.supportsBinary, function(data) {
				    self.write(data);
			  	});
			}

			this.write = function(data) {
				this.doWrite(data);
				this.req.cleanup();
				this.writable = false;
			}

			this.doClose = function(fn) {
				if(this.dataReq) {
					this.dataReq.destroy();
				}
				if(this.writable) {
					this.send([{ type: "close"}]);
					fn();
				} else {
					this.shouldClose = fn;
				}
			}
		}).call(Polling.prototype);
	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
