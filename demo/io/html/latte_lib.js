
(function(define) {'use strict'
define("latte_io/index.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

		var transports = require("./transports");
		var latte_lib = require("latte_lib");
		var debug = latte_lib.debug.info;
		var parser = require("./parser");
		var parseuri = function(str) {
			var re = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

			var parts = [
			    'source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'
			];
		    var src = str,
		        b = str.indexOf('['),
		        e = str.indexOf(']');

		    if (b != -1 && e != -1) {
		        str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ';') + str.substring(e, str.length);
		    }

		    var m = re.exec(str || ''),
		        uri = {},
		        i = 14;

		    while (i--) {
		        uri[parts[i]] = m[i] || '';
		    }

		    if (b != -1 && e != -1) {
		        uri.source = src;
		        uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ':');
		        uri.authority = uri.authority.replace('[', '').replace(']', '').replace(/;/g, ':');
		        uri.ipv6uri = true;
		    }

		    return uri;
		};
		var parsejson = function(data) {
			var rvalidchars = /^[\],:{}\s]*$/;
			var rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
			var rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
			var rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g;
			var rtrimLeft = /^\s+/;
			var rtrimRight = /\s+$/;
		  if ('string' != typeof data || !data) {
		    return null;
		  }

		  data = data.replace(rtrimLeft, '').replace(rtrimRight, '');

		  // Attempt to parse using the native JSON parser first
		  if ( JSON.parse) {
		    return JSON.parse(data);
		  }

		  if (rvalidchars.test(data.replace(rvalidescape, '@')
		      .replace(rvalidtokens, ']')
		      .replace(rvalidbraces, ''))) {
		    return (new Function('return ' + data))();
		  }
		};
		var parseqs = {
			encode : function (obj) {
			  var str = '';

			  for (var i in obj) {
			    if (obj.hasOwnProperty(i)) {
			      if (str.length) str += '&';
			      str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
			    }
			  }

			  return str;
			},
			decode : function(qs){
			  var qry = {};
			  var pairs = qs.split('&');
			  for (var i = 0, l = pairs.length; i < l; i++) {
			    var pair = pairs[i].split('=');
			    qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
			  }
			  return qry;
			}
		};
		module.exports = Socket;
		function noop(){}

		/**
		 * Socket constructor.
		 *
		 * @param {String|Object} uri or options
		 * @param {Object} options
		 * @api public
		 */

		function Socket(uri, opts){
		  if (!(this instanceof Socket)) return new Socket(uri, opts);

		  opts = opts || {};

		  if (uri && 'object' == typeof uri) {
		    opts = uri;
		    uri = null;
		  }

		  if (uri) {
		    uri = parseuri(uri);
		    opts.host = uri.host;
		    opts.secure = uri.protocol == 'https' || uri.protocol == 'wss';
		    opts.port = uri.port;
				opts.path = uri.path;
		    if (uri.query) opts.query = uri.query;
		  }

		  this.secure = null != opts.secure ? opts.secure :
		    (window.location && 'https:' == location.protocol);

		  if (opts.host) {
		    var match = opts.host.match(/(\[.+\])(.+)?/)
		      , pieces;

		    if (match) {
		      opts.hostname = match[1];
		      if (match[2]) opts.port = match[2].slice(1);
		    } else {
		      pieces = opts.host.split(':');
		      opts.hostname = pieces.shift();
		      if (pieces.length) opts.port = pieces.pop();
		    }

		    // if `host` does not include a port and one is not specified manually,
		    // use the protocol default
		    if (!opts.port) opts.port = this.secure ? '443' : '80';
		  }

		  this.agent = opts.agent || false;
		  this.hostname = opts.hostname ||
		    (window.location ? location.hostname : 'localhost');
		  this.port = opts.port || (window.location && location.port ?
		       location.port :
		       (this.secure ? 443 : 80));
		  this.query = opts.query || {};
		  if ('string' == typeof this.query) this.query = parseqs.decode(this.query);
		  this.upgrade = false !== opts.upgrade;
		  this.path = (opts.path || '/engine.io').replace(/\/$/, '') + '/';
		  this.forceJSONP = !!opts.forceJSONP;
		  this.jsonp = false !== opts.jsonp;
		  this.forceBase64 = !!opts.forceBase64;
		  this.enablesXDR = !!opts.enablesXDR;
		  this.timestampParam = opts.timestampParam || 't';
		  this.timestampRequests = opts.timestampRequests;
		  this.transports = opts.transports || ['polling', 'websocket'];
		  this.readyState = '';
		  this.writeBuffer = [];
		  this.callbackBuffer = [];
		  this.policyPort = opts.policyPort || 843;
		  this.rememberUpgrade = opts.rememberUpgrade || false;
		  this.binaryType = null;
		  this.onlyBinaryUpgrades = opts.onlyBinaryUpgrades;
		  this.perMessageDeflate = false !== opts.perMessageDeflate ? (opts.perMessageDeflate || true) : false;

		  // SSL options for Node.js client
		  this.pfx = opts.pfx || null;
		  this.key = opts.key || null;
		  this.passphrase = opts.passphrase || null;
		  this.cert = opts.cert || null;
		  this.ca = opts.ca || null;
		  this.ciphers = opts.ciphers || null;
		  this.rejectUnauthorized = opts.rejectUnauthorized || null;

		  // other options for Node.js client
		  var freeGlobal = typeof window == 'object' && window;
		  if (freeGlobal.global === freeGlobal) {
		    if (opts.extraHeaders && Object.keys(opts.extraHeaders).length > 0) {
		      this.extraHeaders = opts.extraHeaders;
		    }
		  }
		  this.open();
		};
		(function() {
			this.priorWebsocketSuccess = false;
		}).call(Socket);

		/**
		 * Mix in `Emitter`.
		 */

		latte_lib.inherits(Socket, latte_lib.events);

		(function() {
			this.createTransport = function(name) {
				debug("create transport '%s' ", name);

				var query = latte_lib.clone(this.query);
				query.EIO = parser.protocol;
				query.transport = name;
				if(this.id) query.sid = this.id;
				var transport = new transports[name]({
					agent: this.agent,
				    hostname: this.hostname,
				    port: this.port,
				    secure: this.secure,
				    path: this.path,
				    query: query,
				    forceJSONP: this.forceJSONP,
				    jsonp: this.jsonp,
				    forceBase64: this.forceBase64,
				    enablesXDR: this.enablesXDR,
				    timestampRequests: this.timestampRequests,
				    timestampParam: this.timestampParam,
				    policyPort: this.policyPort,
				    socket: this,
				    pfx: this.pfx,
				    key: this.key,
				    passphrase: this.passphrase,
				    cert: this.cert,
				    ca: this.ca,
				    ciphers: this.ciphers,
				    rejectUnauthorized: this.rejectUnauthorized,
				    perMessageDeflate: this.perMessageDeflate,
				    extraHeaders: this.extraHeaders
				});
				return transport;
			}
			this.open = function() {
				var transport;
				if (this.rememberUpgrade && Socket.priorWebsocketSuccess && this.transports.indexOf('websocket') != -1) {
					transport = 'websocket';
				} else if (0 === this.transports.length) {
					// Emit error on next tick so it can be listened to
					var self = this;
					setTimeout(function() {
						self.emit('error', 'No transports available');
					}, 0);
					return;
				} else {
					transport = this.transports[0];
				}
				this.readyState = 'opening';

				// Retry with the next transport if the transport is disabled (jsonp: false)
				//var transport;

				try {
					transport = this.createTransport(transport);
				} catch (e) {
					this.transports.shift();
					this.open();
					return;
				}

				transport.open();
				this.setTransport(transport);
			};
			this.setTransport = function(transport) {
				debug("setting transport %s", transport.name);
				var self = this;
				if(this.transport) {
					debug("clearing existing transport %s", this.transport.name);
					this.transport.removeAllListeners();
				}
				this.transport = transport;
				transport
				.on('drain', function(){
					self.onDrain();
				})
				.on('packet', function(packet){
					self.onPacket(packet);
				})
				.on('error', function(e){
					self.onError(e);
				})
				.on('close', function(){
					self.onClose('transport close');
				});
			};
			this.probe = function (name) {
			  debug('probing transport "%s"', name);
			  var transport = this.createTransport(name, { probe: 1 })
			    , failed = false
			    , self = this;

			  Socket.priorWebsocketSuccess = false;

			  function onTransportOpen(){
			    if (self.onlyBinaryUpgrades) {
			      var upgradeLosesBinary = !this.supportsBinary && self.transport.supportsBinary;
			      failed = failed || upgradeLosesBinary;
			    }
			    if (failed) return;

			    debug('probe transport "%s" opened', name);
			    transport.send([{ type: 'ping', data: 'probe', options: { compress: true } }]);
			    transport.once('packet', function (msg) {
			      if (failed) return;
			      if ('pong' == msg.type && 'probe' == msg.data) {
			        debug('probe transport "%s" pong', name);
			        self.upgrading = true;
			        self.emit('upgrading', transport);
			        if (!transport) return;
			        Socket.priorWebsocketSuccess = 'websocket' == transport.name;

			        debug('pausing current transport "%s"', self.transport.name);
			        self.transport.pause(function () {
			          if (failed) return;
			          if ('closed' == self.readyState) return;
			          debug('changing transport and sending upgrade packet');

			          cleanup();

			          self.setTransport(transport);
			          transport.send([{ type: 'upgrade', options: { compress: true } }]);
			          self.emit('upgrade', transport);
			          transport = null;
			          self.upgrading = false;
			          self.flush();
			        });
			      } else {
			        debug('probe transport "%s" failed', name);
			        var err = new Error('probe error');
			        err.transport = transport.name;
			        self.emit('upgradeError', err);
			      }
			    });
			  }

			  function freezeTransport() {
			    if (failed) return;

			    // Any callback called by transport should be ignored since now
			    failed = true;

			    cleanup();

			    transport.close();
			    transport = null;
			  }

			  //Handle any error that happens while probing
			  function onerror(err) {
			    var error = new Error('probe error: ' + err);
			    error.transport = transport.name;

			    freezeTransport();

			    debug('probe transport "%s" failed because of error: %s', name, err);

			    self.emit('upgradeError', error);
			  }

			  function onTransportClose(){
			    onerror("transport closed");
			  }

			  //When the socket is closed while we're probing
			  function onclose(){
			    onerror("socket closed");
			  }

			  //When the socket is upgraded while we're probing
			  function onupgrade(to){
			    if (transport && to.name != transport.name) {
			      debug('"%s" works - aborting "%s"', to.name, transport.name);
			      freezeTransport();
			    }
			  }

			  //Remove all listeners on the transport and on self
			  function cleanup(){
			    transport.removeListener('open', onTransportOpen);
			    transport.removeListener('error', onerror);
			    transport.removeListener('close', onTransportClose);
			    self.removeListener('close', onclose);
			    self.removeListener('upgrading', onupgrade);
			  }

			  transport.once('open', onTransportOpen);
			  transport.once('error', onerror);
			  transport.once('close', onTransportClose);

			  this.once('close', onclose);
			  this.once('upgrading', onupgrade);

			  transport.open();

			};

			this.onOpen = function () {
			  debug('socket open');
			  this.readyState = 'open';
			  Socket.priorWebsocketSuccess = 'websocket' == this.transport.name;
			  this.emit('open');
			  this.flush();

			  // we check for `readyState` in case an `open`
			  // listener already closed the socket
			  if ('open' == this.readyState && this.upgrade && this.transport.pause) {
			    debug('starting upgrade probes');
			    for (var i = 0, l = this.upgrades.length; i < l; i++) {
			      this.probe(this.upgrades[i]);
			    }
			  }
			};
			this.onPacket = function (packet) {
			  if ('opening' == this.readyState || 'open' == this.readyState) {
			    debug('socket receive: type "%s", data "%s"', packet.type, packet.data);

			    this.emit('packet', packet);

			    // Socket is live - any packet counts
			    this.emit('heartbeat');

			    switch (packet.type) {
			      case 'open':
			        this.onHandshake(parsejson(packet.data));
			        break;

			      case 'pong':
			        this.setPing();
			        this.emit('pong');
			        break;

			      case 'error':
			        var err = new Error('server error');
			        err.code = packet.data;
			        this.onError(err);
			        break;

			      case 'message':
			        this.emit('data', packet.data);
			        this.emit('message', packet.data);
			        break;
			    }
			  } else {
			    debug('packet received with socket readyState "%s"', this.readyState);
			  }
			};
			this.onHandshake = function (data) {

			  this.emit('handshake', data);
			  this.id = data.sid;
			  this.transport.query.sid = data.sid;
			  this.upgrades = this.filterUpgrades(data.upgrades);
			  this.pingInterval = data.pingInterval;
			  this.pingTimeout = data.pingTimeout;
			  this.onOpen();
			  // In case open handler closes socket
			  if  ('closed' == this.readyState) return;
			  this.setPing();

			  // Prolong liveness of socket on heartbeat
			  this.removeListener('heartbeat', this.onHeartbeat);
			  this.on('heartbeat', this.onHeartbeat);
			};
			this.onHeartbeat = function (timeout) {
			  clearTimeout(this.pingTimeoutTimer);
			  var self = this;
			  self.pingTimeoutTimer = setTimeout(function () {
			    if ('closed' == self.readyState) return;
			    self.onClose('ping timeout');
			  }, timeout || (self.pingInterval + self.pingTimeout));
			};

			this.setPing = function () {
			  var self = this;
			  clearTimeout(self.pingIntervalTimer);
			  self.pingIntervalTimer = setTimeout(function () {
			    debug('writing ping packet - expecting pong within %sms', self.pingTimeout);
			    self.ping();
			    self.onHeartbeat(self.pingTimeout);
			  }, self.pingInterval);
			};
			this.ping = function () {
			  var self = this;
			  this.sendPacket('ping', function(){
			    self.emit('ping');
			  });
			};

			this.onDrain = function() {
			  for (var i = 0; i < this.prevBufferLen; i++) {
			    if (this.callbackBuffer[i]) {
			      this.callbackBuffer[i]();
			    }
			  }

			  this.writeBuffer.splice(0, this.prevBufferLen);
			  this.callbackBuffer.splice(0, this.prevBufferLen);

			  // setting prevBufferLen = 0 is very important
			  // for example, when upgrading, upgrade packet is sent over,
			  // and a nonzero prevBufferLen could cause problems on `drain`
			  this.prevBufferLen = 0;

			  if (0 === this.writeBuffer.length) {
			    this.emit('drain');
			  } else {
			    this.flush();
			  }
			};

			this.flush = function () {
			  if ('closed' != this.readyState && this.transport.writable &&
			    !this.upgrading && this.writeBuffer.length) {
			    debug('flushing %d packets in socket', this.writeBuffer.length);
			    this.transport.send(this.writeBuffer);
			    // keep track of current length of writeBuffer
			    // splice writeBuffer and callbackBuffer on `drain`
			    this.prevBufferLen = this.writeBuffer.length;
			    this.emit('flush');
			  }
			};



			this.write =
			this.send = function (msg, options, fn) {
			  this.sendPacket('message', msg, options, fn);
			  return this;
			};

		this.sendPacket = function (type, data, options, fn) {
		  if('function' == typeof data) {
		    fn = data;
		    data = undefined;
		  }

		  if ('function' == typeof options) {
		    fn = options;
		    options = null;
		  }

		  if ('closing' == this.readyState || 'closed' == this.readyState) {
		    return;
		  }

		  options = options || {};
		  options.compress = false !== options.compress;

		  var packet = {
		    type: type,
		    data: data,
		    options: options
		  };
		  this.emit('packetCreate', packet);
		  this.writeBuffer.push(packet);
		  this.callbackBuffer.push(fn);
		  this.flush();
		};

		/**
		 * Closes the connection.
		 *
		 * @api private
		 */

		this.close = function () {
		  if ('opening' == this.readyState || 'open' == this.readyState) {
		    this.readyState = 'closing';

		    var self = this;

		    if (this.writeBuffer.length) {
		      this.once('drain', function() {
		        if (this.upgrading) {
		          waitForUpgrade();
		        } else {
		          close();
		        }
		      });
		    } else if (this.upgrading) {
		      waitForUpgrade();
		    } else {
		      close();
		    }
		  }

		  function close() {
		    self.onClose('forced close');
		    debug('socket closing - telling transport to close');
		    self.transport.close();
		  }

		  function cleanupAndClose() {
		    self.removeListener('upgrade', cleanupAndClose);
		    self.removeListener('upgradeError', cleanupAndClose);
		    close();
		  }

		  function waitForUpgrade() {
		    // wait for upgrade to finish since we can't send packets while pausing a transport
		    self.once('upgrade', cleanupAndClose);
		    self.once('upgradeError', cleanupAndClose);
		  }

		  return this;
		};

		this.onError = function (err) {
		  debug('socket error %j', err);
		  Socket.priorWebsocketSuccess = false;
		  this.emit('error', err);
		  this.onClose('transport error', err);
		};

		this.onClose = function (reason, desc) {
		  if ('opening' == this.readyState || 'open' == this.readyState || 'closing' == this.readyState) {
		    debug('socket close with reason: "%s"', reason);
		    var self = this;

		    // clear timers
		    clearTimeout(this.pingIntervalTimer);
		    clearTimeout(this.pingTimeoutTimer);

		    // clean buffers in next tick, so developers can still
		    // grab the buffers on `close` event
		    setTimeout(function() {
		      self.writeBuffer = [];
		      self.callbackBuffer = [];
		      self.prevBufferLen = 0;
		    }, 0);

		    // stop event from firing again for transport
		    this.transport.removeAllListeners('close');

		    // ensure transport won't stay open
		    this.transport.close();

		    // ignore further transport communication
		    this.transport.removeAllListeners();

		    // set ready state
		    this.readyState = 'closed';

		    // clear session id
		    this.id = null;

		    // emit close event
		    this.emit('close', reason, desc);
		  }
		};

		this.filterUpgrades = function (upgrades) {
		  var filteredUpgrades = [];
		  for (var i = 0, j = upgrades.length; i<j; i++) {
		    if (~this.transports.indexOf(upgrades[i])) filteredUpgrades.push(upgrades[i]);
		  }
		  return filteredUpgrades;
		};
	}).call(Socket.prototype);








});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_io/parser.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

		var latte_lib = require("latte_lib");
		var utf8 = latte_lib.utf8;
		var noop = function() {};
		var after = function(count, callback, err_cb) {
		    var bail = false
		    err_cb = err_cb || noop
		    proxy.count = count

		    return (count === 0) ? callback() : proxy

		    function proxy(err, result) {
		        if (proxy.count <= 0) {
		            throw new Error('after called too many times')
		        }
		        --proxy.count

		        // after first error, rest are passed to err_cb
		        if (err) {
		            bail = true
		            callback(err)
		            // future error callbacks will go to error handler
		            callback = err_cb
		        } else if (proxy.count === 0 && !bail) {
		            callback(null, result)
		        }
		    }
		};
		var keys = Object.keys;


		if(!window) {

			var keys = Object.keys;

		var err = { type: 'error', data: 'parser error' };
		(function() {
				this.protocol = 3;
				var packets = this.packets = {
				    open:     0    // non-ws
				  , close:    1    // non-ws
				  , ping:     2
				  , pong:     3
				  , message:  4
				  , upgrade:  5
				  , noop:     6
				};
				var packetslist = keys(packets);
				this.encodePacket = function (packet, supportsBinary, utf8encode, callback) {
				  if ('function' == typeof supportsBinary) {
				    callback = supportsBinary;
				    supportsBinary = null;
				  }

				  if ('function' == typeof utf8encode ) {
				    callback = utf8encode;
				    utf8encode = null;
				  }

				  var data = (packet.data === undefined)
				    ? undefined
				    : packet.data.buffer || packet.data;

				  if (Buffer.isBuffer(data)) {
				    return encodeBuffer(packet, supportsBinary, callback);
				  } else if (data instanceof ArrayBuffer) {
				    return encodeArrayBuffer(packet, supportsBinary, callback);
				  }

				  // Sending data as a utf-8 string
				  var encoded = packets[packet.type];

				  // data fragment is optional
				  if (undefined !== packet.data) {
				    encoded += utf8encode ? utf8.encode(String(packet.data)) : String(packet.data);
				  }

				  return callback('' + encoded);
				};

					function encodeBuffer(packet, supportsBinary, callback) {
					  var data = packet.data;
					  if (!supportsBinary) {
					    return exports.encodeBase64Packet(packet, callback);
					  }

					  var typeBuffer = new Buffer(1);
					  typeBuffer[0] = packets[packet.type];
					  return callback(Buffer.concat([typeBuffer, data]));
					}

					function encodeArrayBuffer(packet, supportsBinary, callback) {
					  var data = (packet.data === undefined)
					    ? undefined
					    : packet.data.buffer || packet.data;

					  if (!supportsBinary) {
					    return exports.encodeBase64Packet(packet, callback);
					  }

					  var contentArray = new Uint8Array(data);
					  var resultBuffer = new Buffer(1 + data.byteLength);

					  resultBuffer[0] = packets[packet.type];
					  for (var i = 0; i < contentArray.length; i++){
					    resultBuffer[i+1] = contentArray[i];
					  }
					  return callback(resultBuffer);
					}
				this.encodeBase64Packet = function(packet, callback){
				  var data = packet.data.buffer || packet.data;
				  if (data instanceof ArrayBuffer) {
				    var buf = new Buffer(data.byteLength);
				    for (var i = 0; i < buf.length; i++) {
				      buf[i] = data[i];
				    }
				    packet.data = buf;
				  }

				  var message = 'b' + packets[packet.type];
				  message += packet.data.toString('base64');
				  return callback(message);
				};
				this.decodePacket = function (data, binaryType, utf8decode) {
				  // String data
				  if (typeof data == 'string' || data === undefined) {
				    if (data.charAt(0) == 'b') {
				      return exports.decodeBase64Packet(data.substr(1), binaryType);
				    }

				    var type = data.charAt(0);
				    if (utf8decode) {
				      try {
				        data = utf8.decode(data);
				      } catch (e) {
				        return err;
				      }
				    }

				    if (Number(type) != type || !packetslist[type]) {
				      return err;
				    }

				    if (data.length > 1) {
				      return { type: packetslist[type], data: data.substring(1) };
				    } else {
				      return { type: packetslist[type] };
				    }
				  }

				  // Binary data
				  if (binaryType === 'arraybuffer') {
				    var type = data[0];
				    var intArray = new Uint8Array(data.length - 1);
				    for (var i = 1; i < data.length; i++) {
				      intArray[i - 1] = data[i];
				    }
				    return { type: packetslist[type], data: intArray.buffer };
				  }
				  var type = data[0];
				  return { type: packetslist[type], data: data.slice(1) };
				};

				this.decodeBase64Packet = function(msg, binaryType) {
				  var type = packetslist[msg.charAt(0)];
				  var data = new Buffer(msg.substr(1), 'base64');
				  if (binaryType === 'arraybuffer') {
				    var abv = new Uint8Array(data.length);
				    for (var i = 0; i < abv.length; i++){
				      abv[i] = data[i];
				    }
				    data = abv.buffer;
				  }
				  return { type: type, data: data };
				};
				this.encodePayload = function (packets, supportsBinary, callback) {
				  if (typeof supportsBinary == 'function') {
				    callback = supportsBinary;
				    supportsBinary = null;
				  }

				  if (supportsBinary) {
				    return exports.encodePayloadAsBinary(packets, callback);
				  }

				  if (!packets.length) {
				    return callback('0:');
				  }

				  function setLengthHeader(message) {
				    return message.length + ':' + message;
				  }

				  function encodeOne(packet, doneCallback) {
				    exports.encodePacket(packet, supportsBinary, true, function(message) {
				      doneCallback(null, setLengthHeader(message));
				    });
				  }

				  map(packets, encodeOne, function(err, results) {
				    return callback(results.join(''));
				  });
				};
				function map(ary, each, done) {
				  var result = new Array(ary.length);
				  var next = after(ary.length, done);

				  var eachWithIndex = function(i, el, cb) {
				    each(el, function(error, msg) {
				      result[i] = msg;
				      cb(error, result);
				    });
				  };

				  for (var i = 0; i < ary.length; i++) {
				    eachWithIndex(i, ary[i], next);
				  }
				}

				this.decodePayload = function (data, binaryType, callback) {
				  if ('string' != typeof data) {
				    return exports.decodePayloadAsBinary(data, binaryType, callback);
				  }

				  if (typeof binaryType === 'function') {
				    callback = binaryType;
				    binaryType = null;
				  }

				  var packet;
				  if (data == '') {
				    // parser error - ignoring payload
				    return callback(err, 0, 1);
				  }

				  var length = ''
				    , n, msg;

				  for (var i = 0, l = data.length; i < l; i++) {
				    var chr = data.charAt(i);

				    if (':' != chr) {
				      length += chr;
				    } else {
				      if ('' == length || (length != (n = Number(length)))) {
				        // parser error - ignoring payload
				        return callback(err, 0, 1);
				      }

				      msg = data.substr(i + 1, n);

				      if (length != msg.length) {
				        // parser error - ignoring payload
				        return callback(err, 0, 1);
				      }

				      if (msg.length) {
				        packet = exports.decodePacket(msg, binaryType, true);

				        if (err.type == packet.type && err.data == packet.data) {
				          // parser error in individual packet - ignoring payload
				          return callback(err, 0, 1);
				        }

				        var ret = callback(packet, i + n, l);
				        if (false === ret) return;
				      }

				      // advance cursor
				      i += n;
				      length = '';
				    }
				  }

				  if (length != '') {
				    // parser error - ignoring payload
				    return callback(err, 0, 1);
				  }

				};
					function bufferToString(buffer) {
					  var str = '';
					  for (var i = 0; i < buffer.length; i++) {
					    str += String.fromCharCode(buffer[i]);
					  }
					  return str;
					}

					function stringToBuffer(string) {
					  var buf = new Buffer(string.length);
					  for (var i = 0; i < string.length; i++) {
					    buf.writeUInt8(string.charCodeAt(i), i);
					  }
					  return buf;
					}
				this.encodePayloadAsBinary = function (packets, callback) {
				  if (!packets.length) {
				    return callback(new Buffer(0));
				  }

				  function encodeOne(p, doneCallback) {
				    exports.encodePacket(p, true, true, function(packet) {

				      if (typeof packet === 'string') {
				        var encodingLength = '' + packet.length;
				        var sizeBuffer = new Buffer(encodingLength.length + 2);
				        sizeBuffer[0] = 0; // is a string (not true binary = 0)
				        for (var i = 0; i < encodingLength.length; i++) {
				          sizeBuffer[i + 1] = parseInt(encodingLength[i], 10);
				        }
				        sizeBuffer[sizeBuffer.length - 1] = 255;
				        return doneCallback(null, Buffer.concat([sizeBuffer, stringToBuffer(packet)]));
				      }

				      var encodingLength = '' + packet.length;
				      var sizeBuffer = new Buffer(encodingLength.length + 2);
				      sizeBuffer[0] = 1; // is binary (true binary = 1)
				      for (var i = 0; i < encodingLength.length; i++) {
				        sizeBuffer[i + 1] = parseInt(encodingLength[i], 10);
				      }
				      sizeBuffer[sizeBuffer.length - 1] = 255;
				      doneCallback(null, Buffer.concat([sizeBuffer, packet]));
				    });
				  }

				  map(packets, encodeOne, function(err, results) {
				    return callback(Buffer.concat(results));
				  });
				};

				this.decodePayloadAsBinary = function (data, binaryType, callback) {
				  if (typeof binaryType === 'function') {
				    callback = binaryType;
				    binaryType = null;
				  }

				  var bufferTail = data;
				  var buffers = [];

				  while (bufferTail.length > 0) {
				    var strLen = '';
				    var isString = bufferTail[0] === 0;
				    var numberTooLong = false;
				    for (var i = 1; ; i++) {
				      if (bufferTail[i] == 255)  break;
				      // 310 = char length of Number.MAX_VALUE
				      if (strLen.length > 310) {
				        numberTooLong = true;
				        break;
				      }
				      strLen += '' + bufferTail[i];
				    }
				    if(numberTooLong) return callback(err, 0, 1);
				    bufferTail = bufferTail.slice(strLen.length + 1);

				    var msgLength = parseInt(strLen, 10);

				    var msg = bufferTail.slice(1, msgLength + 1);
				    if (isString) msg = bufferToString(msg);
				    buffers.push(msg);
				    bufferTail = bufferTail.slice(msgLength + 1);
				  }

				  var total = buffers.length;
				  buffers.forEach(function(buffer, i) {
				    callback(exports.decodePacket(buffer, binaryType, true), i, total);
				  });
				};
			}).call(module.exports);
		}else{
			var hasBinary = function hasBinary(data) {

			  function _hasBinary(obj) {
			    if (!obj) return false;
			    if ( (window.Buffer && window.Buffer.isBuffer(obj)) ||
			         (window.ArrayBuffer && obj instanceof ArrayBuffer) ||
			         (window.Blob && obj instanceof window.Blob) ||
			         (window.File && obj instanceof window.File)
			        ) {
			      return true;
			    }

			    if (latte_lib.isArray(obj)) {
			      for (var i = 0; i < obj.length; i++) {
			          if (_hasBinary(obj[i])) {
			              return true;
			          }
			      }
			    } else if (obj && 'object' == typeof obj) {
			      if (obj.toJSON) {
			        obj = obj.toJSON();
			      }

			      for (var key in obj) {
			        if (obj.hasOwnProperty(key) && _hasBinary(obj[key])) {
			          return true;
			        }
			      }
			    }

			    return false;
			  }

			  return _hasBinary(data);
			};
			var sliceBuffer = function(arraybuffer, start, end) {
			  var bytes = arraybuffer.byteLength;
			  start = start || 0;
			  end = end || bytes;

			  if (arraybuffer.slice) { return arraybuffer.slice(start, end); }

			  if (start < 0) { start += bytes; }
			  if (end < 0) { end += bytes; }
			  if (end > bytes) { end = bytes; }

			  if (start >= bytes || start >= end || bytes === 0) {
			    return new ArrayBuffer(0);
			  }

			  var abv = new Uint8Array(arraybuffer);
			  var result = new Uint8Array(end - start);
			  for (var i = start, ii = 0; i < end; i++, ii++) {
			    result[ii] = abv[i];
			  }
			  return result.buffer;
			};

			var base64encoder = latte_lib.base64;



			/**
			 * Check if we are running an android browser. That requires us to use
			 * ArrayBuffer with polling transports...
			 *
			 * http://ghinda.net/jpeg-blob-ajax-android/
			 */

			var isAndroid = navigator.userAgent.match(/Android/i);

			/**
			 * Check if we are running in PhantomJS.
			 * Uploading a Blob with PhantomJS does not work correctly, as reported here:
			 * https://github.com/ariya/phantomjs/issues/11395
			 * @type boolean
			 */
			var isPhantomJS = /PhantomJS/i.test(navigator.userAgent);

			/**
			 * When true, avoids using Blobs to encode payloads.
			 * @type boolean
			 */
			var dontSendBlobs = isAndroid || isPhantomJS;

			/**
			 * Current protocol version.
			 */



			/**
			 * Premade error packet.
			 */

			var err = { type: 'error', data: 'parser error' };

			/**
			 * Create a blob api even for blob builder when vendor prefixes exist
			 */

			var BlobBuilder = window.BlobBuilder
			  || window.WebKitBlobBuilder
			  || window.MSBlobBuilder
			  || window.MozBlobBuilder;

			/**
			 * Check if Blob constructor is supported
			 */
			 var Blob = (function() {
			  if (blobSupported) {
			    return window.Blob;
			  } else if (blobBuilderSupported) {
			    return BlobBuilderConstructor;
			  } else {
			    return undefined;
			  }
			})();
			var blobSupported = (function() {
			  try {
			    var b = new window.Blob(['hi']);
			    return b.size == 2;
			  } catch(e) {
			    return false;
			  }
			})();

			/**
			 * Check if BlobBuilder is supported
			 */

			var blobBuilderSupported = BlobBuilder
			  && BlobBuilder.prototype.append
			  && BlobBuilder.prototype.getBlob;

			var BlobBuilderConstructor = function (ary, options) {
			  options = options || {};

			  var bb = new BlobBuilder();
			  for (var i = 0; i < ary.length; i++) {
			    bb.append(ary[i]);
			  }
			  return (options.type) ? bb.getBlob(options.type) : bb.getBlob();
			};

			
			(function() {
				this.protocol = 3;
				var packets = this.packets = {
				    open:     0    // non-ws
				  , close:    1    // non-ws
				  , ping:     2
				  , pong:     3
				  , message:  4
				  , upgrade:  5
				  , noop:     6
				};

				var packetslist = keys(packets);
				this.encodePacket = function (packet, supportsBinary, utf8encode, callback) {
				  if ('function' == typeof supportsBinary) {
				    callback = supportsBinary;
				    supportsBinary = false;
				  }

				  if ('function' == typeof utf8encode) {
				    callback = utf8encode;
				    utf8encode = null;
				  }

				  var data = (packet.data === undefined)
				    ? undefined
				    : packet.data.buffer || packet.data;

				  if (window.ArrayBuffer && data instanceof ArrayBuffer) {
				    return encodeArrayBuffer(packet, supportsBinary, callback);
				  } else if (Blob && data instanceof window.Blob) {
				    return encodeBlob(packet, supportsBinary, callback);
				  }

				  // might be an object with { base64: true, data: dataAsBase64String }
				  if (data && data.base64) {
				    return encodeBase64Object(packet, callback);
				  }

				  // Sending data as a utf-8 string
				  var encoded = packets[packet.type];

				  // data fragment is optional
				  if (undefined !== packet.data) {
				    encoded += utf8encode ? utf8.encode(String(packet.data)) : String(packet.data);
				  }

				  return callback('' + encoded);

				};
				var encodeBase64Object = function (packet, callback) {
				  // packet data is an object { base64: true, data: dataAsBase64String }
				  var message = 'b' + exports.packets[packet.type] + packet.data.data;
				  return callback(message);
				}

				var encodeArrayBuffer = function (packet, supportsBinary, callback) {
				  if (!supportsBinary) {
				    return exports.encodeBase64Packet(packet, callback);
				  }

				  var data = packet.data;
				  var contentArray = new Uint8Array(data);
				  var resultBuffer = new Uint8Array(1 + data.byteLength);

				  resultBuffer[0] = packets[packet.type];
				  for (var i = 0; i < contentArray.length; i++) {
				    resultBuffer[i+1] = contentArray[i];
				  }

				  return callback(resultBuffer.buffer);
				}

				var encodeBlobAsArrayBuffer = function (packet, supportsBinary, callback) {
				  if (!supportsBinary) {
				    return exports.encodeBase64Packet(packet, callback);
				  }

				  var fr = new FileReader();
				  fr.onload = function() {
				    packet.data = fr.result;
				    exports.encodePacket(packet, supportsBinary, true, callback);
				  };
				  return fr.readAsArrayBuffer(packet.data);
				}

				var encodeBlob = function (packet, supportsBinary, callback) {
				  if (!supportsBinary) {
				    return exports.encodeBase64Packet(packet, callback);
				  }

				  if (dontSendBlobs) {
				    return encodeBlobAsArrayBuffer(packet, supportsBinary, callback);
				  }

				  var length = new Uint8Array(1);
				  length[0] = packets[packet.type];
				  var blob = new Blob([length.buffer, packet.data]);

				  return callback(blob);
				}
				var _self = this;
				this.encodeBase64Packet = function(packet, callback) {
				  var message = 'b' + _self.packets[packet.type];
				  if (Blob && packet.data instanceof Blob) {
				    var fr = new FileReader();
				    fr.onload = function() {
				      var b64 = fr.result.split(',')[1];
				      callback(message + b64);
				    };
				    return fr.readAsDataURL(packet.data);
				  }

				  var b64data;
				  try {
				    b64data = String.fromCharCode.apply(null, new Uint8Array(packet.data));
				  } catch (e) {
				    // iPhone Safari doesn't let you apply with typed arrays
				    var typed = new Uint8Array(packet.data);
				    var basic = new Array(typed.length);
				    for (var i = 0; i < typed.length; i++) {
				      basic[i] = typed[i];
				    }
				    b64data = String.fromCharCode.apply(null, basic);
				  }
				  message += window.btoa(b64data);
				  return callback(message);
				};

				this.decodePacket = function (data, binaryType, utf8decode) {
				  // String data
				  if (typeof data == 'string' || data === undefined) {
				    if (data.charAt(0) == 'b') {
				      return exports.decodeBase64Packet(data.substr(1), binaryType);
				    }

				    if (utf8decode) {
				      try {
				        data = utf8.decode(data);
				      } catch (e) {
				        return err;
				      }
				    }
				    var type = data.charAt(0);

				    if (Number(type) != type || !packetslist[type]) {
				      return err;
				    }

				    if (data.length > 1) {
				      return { type: packetslist[type], data: data.substring(1) };
				    } else {
				      return { type: packetslist[type] };
				    }
				  }

				  var asArray = new Uint8Array(data);
				  var type = asArray[0];
				  var rest = sliceBuffer(data, 1);
				  if (Blob && binaryType === 'blob') {
				    rest = new Blob([rest]);
				  }
				  return { type: packetslist[type], data: rest };
				};

				this.decodeBase64Packet = function(msg, binaryType) {
				  var type = packetslist[msg.charAt(0)];
				  if (!window.ArrayBuffer) {
				    return { type: type, data: { base64: true, data: msg.substr(1) } };
				  }

				  var data = base64encoder.decode(msg.substr(1));

				  if (binaryType === 'blob' && Blob) {
				    data = new Blob([data]);
				  }

				  return { type: type, data: data };
				};
					var map = function (ary, each, done) {
					  var result = new Array(ary.length);
					  var next = after(ary.length, done);

					  var eachWithIndex = function(i, el, cb) {
					    each(el, function(error, msg) {
					      result[i] = msg;
					      cb(error, result);
					    });
					  };

					  for (var i = 0; i < ary.length; i++) {
					    eachWithIndex(i, ary[i], next);
					  }
					}
				this.encodePayload = function (packets, supportsBinary, callback) {
				  if (typeof supportsBinary == 'function') {
				    callback = supportsBinary;
				    supportsBinary = null;
				  }

				  var isBinary = hasBinary(packets);

				  if (supportsBinary && isBinary) {
				    if (Blob && !dontSendBlobs) {
				      return exports.encodePayloadAsBlob(packets, callback);
				    }

				    return exports.encodePayloadAsArrayBuffer(packets, callback);
				  }

				  if (!packets.length) {
				    return callback('0:');
				  }

				  function setLengthHeader(message) {
				    return message.length + ':' + message;
				  }

				  function encodeOne(packet, doneCallback) {
				    exports.encodePacket(packet, !isBinary ? false : supportsBinary, true, function(message) {
				      doneCallback(null, setLengthHeader(message));
				    });
				  }

				  map(packets, encodeOne, function(err, results) {
				    return callback(results.join(''));
				  });
				};

				this.decodePayload = function (data, binaryType, callback) {
				  if (typeof data != 'string') {
				    return exports.decodePayloadAsBinary(data, binaryType, callback);
				  }

				  if (typeof binaryType === 'function') {
				    callback = binaryType;
				    binaryType = null;
				  }

				  var packet;
				  if (data == '') {
				    // parser error - ignoring payload
				    return callback(err, 0, 1);
				  }

				  var length = ''
				    , n, msg;

				  for (var i = 0, l = data.length; i < l; i++) {
				    var chr = data.charAt(i);

				    if (':' != chr) {
				      length += chr;
				    } else {
				      if ('' == length || (length != (n = Number(length)))) {
				        // parser error - ignoring payload
				        return callback(err, 0, 1);
				      }

				      msg = data.substr(i + 1, n);

				      if (length != msg.length) {
				        // parser error - ignoring payload
				        return callback(err, 0, 1);
				      }

				      if (msg.length) {
				        packet = exports.decodePacket(msg, binaryType, true);

				        if (err.type == packet.type && err.data == packet.data) {
				          // parser error in individual packet - ignoring payload
				          return callback(err, 0, 1);
				        }

				        var ret = callback(packet, i + n, l);
				        if (false === ret) return;
				      }

				      // advance cursor
				      i += n;
				      length = '';
				    }
				  }

				  if (length != '') {
				    // parser error - ignoring payload
				    return callback(err, 0, 1);
				  }

				};

				this.encodePayloadAsArrayBuffer = function(packets, callback) {
				  if (!packets.length) {
				    return callback(new ArrayBuffer(0));
				  }

				  function encodeOne(packet, doneCallback) {
				    exports.encodePacket(packet, true, true, function(data) {
				      return doneCallback(null, data);
				    });
				  }

				  map(packets, encodeOne, function(err, encodedPackets) {
				    var totalLength = encodedPackets.reduce(function(acc, p) {
				      var len;
				      if (typeof p === 'string'){
				        len = p.length;
				      } else {
				        len = p.byteLength;
				      }
				      return acc + len.toString().length + len + 2; // string/binary identifier + separator = 2
				    }, 0);

				    var resultArray = new Uint8Array(totalLength);

				    var bufferIndex = 0;
				    encodedPackets.forEach(function(p) {
				      var isString = typeof p === 'string';
				      var ab = p;
				      if (isString) {
				        var view = new Uint8Array(p.length);
				        for (var i = 0; i < p.length; i++) {
				          view[i] = p.charCodeAt(i);
				        }
				        ab = view.buffer;
				      }

				      if (isString) { // not true binary
				        resultArray[bufferIndex++] = 0;
				      } else { // true binary
				        resultArray[bufferIndex++] = 1;
				      }

				      var lenStr = ab.byteLength.toString();
				      for (var i = 0; i < lenStr.length; i++) {
				        resultArray[bufferIndex++] = parseInt(lenStr[i]);
				      }
				      resultArray[bufferIndex++] = 255;

				      var view = new Uint8Array(ab);
				      for (var i = 0; i < view.length; i++) {
				        resultArray[bufferIndex++] = view[i];
				      }
				    });

				    return callback(resultArray.buffer);
				  });
				};

				this.encodePayloadAsBlob = function(packets, callback) {
				  function encodeOne(packet, doneCallback) {
				    exports.encodePacket(packet, true, true, function(encoded) {
				      var binaryIdentifier = new Uint8Array(1);
				      binaryIdentifier[0] = 1;
				      if (typeof encoded === 'string') {
				        var view = new Uint8Array(encoded.length);
				        for (var i = 0; i < encoded.length; i++) {
				          view[i] = encoded.charCodeAt(i);
				        }
				        encoded = view.buffer;
				        binaryIdentifier[0] = 0;
				      }

				      var len = (encoded instanceof ArrayBuffer)
				        ? encoded.byteLength
				        : encoded.size;

				      var lenStr = len.toString();
				      var lengthAry = new Uint8Array(lenStr.length + 1);
				      for (var i = 0; i < lenStr.length; i++) {
				        lengthAry[i] = parseInt(lenStr[i]);
				      }
				      lengthAry[lenStr.length] = 255;

				      if (Blob) {
				        var blob = new Blob([binaryIdentifier.buffer, lengthAry.buffer, encoded]);
				        doneCallback(null, blob);
				      }
				    });
				  }

				  map(packets, encodeOne, function(err, results) {
				    return callback(new Blob(results));
				  });
				};

				this.decodePayloadAsBinary = function (data, binaryType, callback) {
				  if (typeof binaryType === 'function') {
				    callback = binaryType;
				    binaryType = null;
				  }

				  var bufferTail = data;
				  var buffers = [];

				  var numberTooLong = false;
				  while (bufferTail.byteLength > 0) {
				    var tailArray = new Uint8Array(bufferTail);
				    var isString = tailArray[0] === 0;
				    var msgLength = '';

				    for (var i = 1; ; i++) {
				      if (tailArray[i] == 255) break;

				      if (msgLength.length > 310) {
				        numberTooLong = true;
				        break;
				      }

				      msgLength += tailArray[i];
				    }

				    if(numberTooLong) return callback(err, 0, 1);

				    bufferTail = sliceBuffer(bufferTail, 2 + msgLength.length);
				    msgLength = parseInt(msgLength);

				    var msg = sliceBuffer(bufferTail, 0, msgLength);
				    if (isString) {
				      try {
				        msg = String.fromCharCode.apply(null, new Uint8Array(msg));
				      } catch (e) {
				        // iPhone Safari doesn't let you apply to typed arrays
				        var typed = new Uint8Array(msg);
				        msg = '';
				        for (var i = 0; i < typed.length; i++) {
				          msg += String.fromCharCode(typed[i]);
				        }
				      }
				    }

				    buffers.push(msg);
				    bufferTail = sliceBuffer(bufferTail, msgLength);
				  }

				  var total = buffers.length;
				  buffers.forEach(function(buffer, i) {
				    callback(exports.decodePacket(buffer, binaryType, true), i, total);
				  });
				};
			}).call(module.exports);

		}

	
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_io/rpcSocket.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

		var latte_lib = require("latte_lib");
		function Socket(url, opts) {
			this.buffers = [];
			this.methods =  {};
			this.id = 0;
			this.url = url;
			this.opts = opts;
			this.open();
			this.isRestart = 1;
		};
		latte_lib.inherits(Socket, latte_lib.events);
		(function() {
			this.close = function() {
				this.isRestart = 0;
				this.socket.close();
			}
			this.open = function() {
				var Socket = require("./index");
				var socket = this.socket = new Socket(this.url, this.opts);
				var self = this;
				socket.on("open", function() {
					self.emit("open");
					var buffer ;
					while(buffer = self.buffers.unshift()) {
						self.write(buffer);
					}
				});
				socket.on("close", function() {
					self.socket = null;
					self.emit("close");
					if(self.isRestart){
						self.open();
					}
				});
				socket.on("error", function(error) {
						console.log(error);
				});
				socket.on("message", function(data) {
					self.onData(data);
				});

			}
			this.send = function(handle, params, callback) {
				var self = this;
				console.log(handle, params);
				if(this.socket) {
					this.write({
						method: handle,
						params: params,
						id: ++self.id
					});
				}else{
					this.buffers.push({
						method: handle,
						params: params,
						id: ++self.id
					});
				}
				callback && this.once(self.id, callback);

			}
				var backData = function(err, result, id) {
					return {
						error: err,
						result: result,
						id: id
					};
				}
			this.write = function(data) {
				this.socket.send(JSON.stringify(data));
			}
			this.Set = function(method, fn) {
				this.methods[method] = fn;
			}
			this.onData = function(data) {
				data = JSON.parse(data)
				var self = this;
				if(data.method) {
					var method = self.methods[data.method];
					if(method) {
						if(!latte_lib.isArray(data.params)) {
							data.params = [].concat(data.params);
						}
						data.params.push(function(err, result){
							self.write(backData(err, result, data.id));
						});
						method.apply(self, data.params);
					}

				}else if(data.id) {
					self.emit(data.id, data.error, data.result);
				}else if(data.code) {
					self.emit("error", data);
					self.close();
				}
			}

		}).call(Socket.prototype);
		module.exports = Socket;
	
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_io/transport.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

	/**
	 * Module dependencies.
	 */

	var parser = require('./parser');
	var latte_lib = require("latte_lib");

	/**
	 * Module exports.
	 */

	module.exports = Transport;

	/**
	 * Transport abstract constructor.
	 *
	 * @param {Object} options.
	 * @api private
	 */

	function Transport (opts) {
	  this.path = opts.path;
	  this.hostname = opts.hostname;
	  this.port = opts.port;
	  this.secure = opts.secure;
	  this.query = opts.query;
	  this.timestampParam = opts.timestampParam;
	  this.timestampRequests = opts.timestampRequests;
	  this.readyState = '';
	  this.agent = opts.agent || false;
	  this.socket = opts.socket;
	  this.enablesXDR = opts.enablesXDR;

	  // SSL options for Node.js client
	  this.pfx = opts.pfx;
	  this.key = opts.key;
	  this.passphrase = opts.passphrase;
	  this.cert = opts.cert;
	  this.ca = opts.ca;
	  this.ciphers = opts.ciphers;
	  this.rejectUnauthorized = opts.rejectUnauthorized;

	  // other options for Node.js client
	  this.extraHeaders = opts.extraHeaders;
	}

	/**
	 * Mix in `Emitter`.
	 */
 	latte_lib.inherits(Transport, latte_lib.events);

	/**
	 * A counter used to prevent collisions in the timestamps used
	 * for cache busting.
	 */
	(function() {
		this.onError = function (msg, desc) {
		  var err = new Error(msg);
		  err.type = 'TransportError';
		  err.description = desc;
		  this.emit('error', err);
		  return this;
		};
		this.open = function () {
		  if ('closed' == this.readyState || '' == this.readyState) {
		    this.readyState = 'opening';
		    this.doOpen();
		  }

		  return this;
		};
		this.close = function () {
		  if ('opening' == this.readyState || 'open' == this.readyState) {
		    this.doClose();
		    this.onClose();
		  }

		  return this;
		};
		this.send = function(packets){
		  if ('open' == this.readyState) {
		    this.write(packets);
		  } else {
		    throw new Error('Transport not open');
		  }
		};
		this.onOpen = function () {
		  this.readyState = 'open';
		  this.writable = true;
		  this.emit('open');
		};
		this.onData = function(data){
		  var packet = parser.decodePacket(data, this.socket.binaryType);
		  this.onPacket(packet);
		};
		this.onPacket = function (packet) {
		  this.emit('packet', packet);
		};
		this.onClose = function () {
		  this.readyState = 'closed';
		  this.emit('close');
		};
	}).call(Transport.prototype);
	Transport.timestamps = 0;


});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_io/transports/index.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {

   var XMLHttpRequest = window ? window.XMLHttpRequest : require("../xmlhttprequest").XMLHttpRequest;
    var XHR = require("./polling-xhr");
    var JSONP = require("./polling-jsonp");
    var websocket = require("./websocket");
    exports.polling = polling;
    exports.websocket = websocket;
    function polling(opts){
      var xhr;
      var xd = false;
      var xs = false;
      var jsonp = false !== opts.jsonp;

      if (window.location) {
        var isSSL = 'https:' == location.protocol;
        var port = location.port;

        // some user agents have empty `location.port`
        if (!port) {
          port = isSSL ? 443 : 80;
        }

        xd = opts.hostname != location.hostname || port != opts.port;
        xs = opts.secure != isSSL;
      }

      opts.xdomain = xd;
      opts.xscheme = xs;
      xhr = new XMLHttpRequest(opts);

      if ('open' in xhr && !opts.forceJSONP) {
        return new XHR(opts);
      } else {
        if (!jsonp) throw new Error('JSONP disabled');
        return new JSONP(opts);
      }
    }



  
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_io/transports/polling-jsonp.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {





  var latte_lib = require("latte_lib");
  /**
   * Module requirements.
   */

  var Polling = require('./polling');

  /**
   * Module exports.
   */

  module.exports = JSONPPolling;

  /**
   * Cached regular expressions.
   */

  var rNewline = /\n/g;
  var rEscapedNewline = /\\n/g;

  /**
   * Global JSONP callbacks.
   */

  var callbacks;

  /**
   * Callbacks count.
   */

  var index = 0;

  /**
   * Noop.
   */

  function empty () { };

  /**
   * JSONP Polling constructor.
   *
   * @param {Object} opts.
   * @api public
   */

  function JSONPPolling (opts) {
    Polling.call(this, opts);

    this.query = this.query || {};

    // define global callbacks array if not present
    // we do this here (lazily) to avoid unneeded global pollution
    if (!callbacks) {
      // we need to consider multiple engines in the same page
      if (!window.___eio) window.___eio = [];
      callbacks = window.___eio;
    }

    // callback identifier
    this.index = callbacks.length;

    // add callback to jsonp global
    var self = this;
    callbacks.push(function (msg) {
      self.onData(msg);
    });

    // append to query string
    this.query.j = this.index;

    // prevent spurious errors from being emitted when the window is unloaded
    if (window.document && window.addEventListener) {
      window.addEventListener('beforeunload', function () {
        if (self.script) self.script.onerror = empty;
      }, false);
    }
  }

  /**
   * Inherits from Polling.
   */

  latte_lib.inherits(JSONPPolling, Polling);

  /*
   * JSONP only supports binary as base64 encoded strings
   */
  (function() {
    this.supportsBinary = false;
    this.doClose = function() {
        if (this.script) {
          this.script.parentNode.removeChild(this.script);
          this.script = null;
        }

        if (this.form) {
          this.form.parentNode.removeChild(this.form);
          this.form = null;
          this.iframe = null;
        }

        Polling.prototype.doClose.call(this);
    }
    this.doPoll = function() {
      var self = this;
      var script = document.createElement('script');

      if (this.script) {
        this.script.parentNode.removeChild(this.script);
        this.script = null;
      }

      script.async = true;
      script.src = this.uri();
      script.onerror = function(e){
        self.onError('jsonp poll error',e);
      };

      var insertAt = document.getElementsByTagName('script')[0];
      insertAt.parentNode.insertBefore(script, insertAt);
      this.script = script;

      var isUAgecko = 'undefined' != typeof navigator && /gecko/i.test(navigator.userAgent);
      
      if (isUAgecko) {
        setTimeout(function () {
          var iframe = document.createElement('iframe');
          document.body.appendChild(iframe);
          document.body.removeChild(iframe);
        }, 100);
      }
    }

    this.doWrite = function (data, fn) {
      var self = this;

      if (!this.form) {
        var form = document.createElement('form');
        var area = document.createElement('textarea');
        var id = this.iframeId = 'eio_iframe_' + this.index;
        var iframe;

        form.className = 'socketio';
        form.style.position = 'absolute';
        form.style.top = '-1000px';
        form.style.left = '-1000px';
        form.target = id;
        form.method = 'POST';
        form.setAttribute('accept-charset', 'utf-8');
        area.name = 'd';
        form.appendChild(area);
        document.body.appendChild(form);

        this.form = form;
        this.area = area;
      }

      this.form.action = this.uri();

      function complete () {
        initIframe();
        fn();
      }

      function initIframe () {
        if (self.iframe) {
          try {
            self.form.removeChild(self.iframe);
          } catch (e) {
            self.onError('jsonp polling iframe removal error', e);
          }
        }

        try {
          // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
          var html = '<iframe src="javascript:0" name="'+ self.iframeId +'">';
          iframe = document.createElement(html);
        } catch (e) {
          iframe = document.createElement('iframe');
          iframe.name = self.iframeId;
          iframe.src = 'javascript:0';
        }

        iframe.id = self.iframeId;

        self.form.appendChild(iframe);
        self.iframe = iframe;
      }

      initIframe();

      // escape \n to prevent it from being converted into \r\n by some UAs
      // double escaping is required for escaped new lines because unescaping of new lines can be done safely on server-side
      data = data.replace(rEscapedNewline, '\\\n');
      this.area.value = data.replace(rNewline, '\\n');

      try {
        this.form.submit();
      } catch(e) {}

      if (this.iframe.attachEvent) {
        this.iframe.onreadystatechange = function(){
          if (self.iframe.readyState == 'complete') {
            complete();
          }
        };
      } else {
        this.iframe.onload = complete;
      }
    };
  }).call(JSONPPolling.prototype);




 
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_io/transports/polling-xhr.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {






/**
 * Module requirements.
 */
var latte_lib = require("latte_lib");
var XMLHttpRequest = window? window.XMLHttpRequest: require("../xmlhttprequest").XMLHttpRequest;
var Polling = require('./polling');
var debug = latte_lib.debug.info;

/**
 * Module exports.
 */

module.exports = XHR;
module.exports.Request = Request;

/**
 * Empty function
 */

function empty(){}

/**
 * XHR Polling constructor.
 *
 * @param {Object} opts
 * @api public
 */

function XHR(opts){
  Polling.call(this, opts);

  if (window.location) {
    var isSSL = 'https:' == location.protocol;
    var port = location.port;

    // some user agents have empty `location.port`
    if (!port) {
      port = isSSL ? 443 : 80;
    }

    this.xd = opts.hostname != window.location.hostname ||
      port != opts.port;
    this.xs = opts.secure != isSSL;
  } else {
    this.extraHeaders = opts.extraHeaders;
  }
}

/**
 * Inherits from Polling.
 */
latte_lib.inherits(XHR, Polling);

/**
 * XHR supports binary
 */

XHR.prototype.supportsBinary = true;

/**
 * Creates a request.
 *
 * @param {String} method
 * @api private
 */

XHR.prototype.request = function(opts){
  opts = opts || {};
  opts.uri = this.uri();
  opts.xd = this.xd;
  opts.xs = this.xs;
  opts.agent = this.agent || false;
  opts.supportsBinary = this.supportsBinary;
  opts.enablesXDR = this.enablesXDR;

  // SSL options for Node.js client
  opts.pfx = this.pfx;
  opts.key = this.key;
  opts.passphrase = this.passphrase;
  opts.cert = this.cert;
  opts.ca = this.ca;
  opts.ciphers = this.ciphers;
  opts.rejectUnauthorized = this.rejectUnauthorized;

  // other options for Node.js client
  opts.extraHeaders = this.extraHeaders;

  return new Request(opts);
};

/**
 * Sends data.
 *
 * @param {String} data to send.
 * @param {Function} called upon flush.
 * @api private
 */

XHR.prototype.doWrite = function(data, fn){
  var isBinary = typeof data !== 'string' && data !== undefined;
  var req = this.request({ method: 'POST', data: data, isBinary: isBinary });
  var self = this;
  req.on('success', fn);
  req.on('error', function(err){
    self.onError('xhr post error', err);
  });
  this.sendXhr = req;
};

/**
 * Starts a poll cycle.
 *
 * @api private
 */

XHR.prototype.doPoll = function(){
  debug('xhr poll');
  var req = this.request();
  var self = this;
  req.on('data', function(data){
    self.onData(data);
  });
  req.on('error', function(err){
    self.onError( err);
  });
  this.pollXhr = req;
};

/**
 * Request constructor
 *
 * @param {Object} options
 * @api public
 */

function Request(opts){
  this.method = opts.method || 'GET';
  this.uri = opts.uri;
  this.xd = !!opts.xd;
  this.xs = !!opts.xs;
  this.async = false !== opts.async;
  this.data = undefined != opts.data ? opts.data : null;
  this.agent = opts.agent;
  this.isBinary = opts.isBinary;
  this.supportsBinary = opts.supportsBinary;
  this.enablesXDR = opts.enablesXDR;

  // SSL options for Node.js client
  this.pfx = opts.pfx;
  this.key = opts.key;
  this.passphrase = opts.passphrase;
  this.cert = opts.cert;
  this.ca = opts.ca;
  this.ciphers = opts.ciphers;
  this.rejectUnauthorized = opts.rejectUnauthorized;

  // other options for Node.js client
  this.extraHeaders = opts.extraHeaders;

  this.create();
}

/**
 * Mix in `Emitter`.
 */

//Emitter(Request.prototype);
latte_lib.inherits(Request, latte_lib.events);

/**
 * Creates the XHR object and sends the request.
 *
 * @api private
 */

Request.prototype.create = function(){
  var opts = { 
      agent: this.agent, 
      xdomain: this.xd, 
      xscheme: this.xs, 
      enablesXDR: this.enablesXDR, 
      pfx: this.pfx,
      key: this.key,
      passphrase: this.passphrase,
      cert: this.cert,
      ca:  this.ca,
      ciphers: this.ciphers,
      rejectUnauthorized: this.rejectUnauthorized
  };

  // SSL options for Node.js client
  /*opts.pfx = this.pfx;
  opts.key = this.key;
  opts.passphrase = this.passphrase;
  opts.cert = this.cert;
  opts.ca = this.ca;
  opts.ciphers = this.ciphers;
  opts.rejectUnauthorized = this.rejectUnauthorized;*/

  var xhr = this.xhr = new XMLHttpRequest(opts);
  var self = this;

  try {
    debug('xhr open %s: %s', this.method, this.uri);
    xhr.open(this.method, this.uri, this.async);
    try {
      if (this.extraHeaders) {
        xhr.setDisableHeaderCheck(true);
        for (var i in this.extraHeaders) {
          if (this.extraHeaders.hasOwnProperty(i)) {
            xhr.setRequestHeader(i, this.extraHeaders[i]);
          }
        }
      }
    } catch (e) {}
    if (this.supportsBinary) {
      // This has to be done after open because Firefox is stupid
      // http://stackoverflow.com/questions/13216903/get-binary-data-with-xmlhttprequest-in-a-firefox-extension
      xhr.responseType = 'arraybuffer';
    }

    if ('POST' == this.method) {
      try {
        if (this.isBinary) {
          xhr.setRequestHeader('Content-type', 'application/octet-stream');
        } else {
          xhr.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
        }
      } catch (e) {}
    }

    // ie6 check
    if ('withCredentials' in xhr) {
      xhr.withCredentials = true;
    }

    if (this.hasXDR()) {
      xhr.onload = function(){
        self.onLoad();
      };
      xhr.onerror = function(){
        self.onError(xhr.responseText);
      };
    } else {
      xhr.onreadystatechange = function(){
        if (4 != xhr.readyState) return;
        if (200 == xhr.status || 1223 == xhr.status) {
          self.onLoad();
        } else {
          // make sure the `error` event handler that's user-set
          // does not throw in the same tick and gets caught here
          setTimeout(function(){
            self.onError(xhr.status);
          }, 0);
        }
      };
    }

    debug('xhr data %s', this.data);
    xhr.send(this.data);
  } catch (e) {
    // Need to defer since .create() is called directly fhrom the constructor
    // and thus the 'error' event can only be only bound *after* this exception
    // occurs.  Therefore, also, we cannot throw here at all.
    setTimeout(function() {
      self.onError(e);
    }, 0);
    return;
  }

  if (window.document) {
    this.index = Request.requestsCount++;
    Request.requests[this.index] = this;
  }
};

/**
 * Called upon successful response.
 *
 * @api private
 */

Request.prototype.onSuccess = function(){
  this.emit('success');
  this.cleanup();
};

/**
 * Called if we have data.
 *
 * @api private
 */

Request.prototype.onData = function(data){
  this.emit('data', data);
  this.onSuccess();
};

/**
 * Called upon error.
 *
 * @api private
 */

Request.prototype.onError = function(err){
  this.emit('error', err);
  this.cleanup(true);
};

/**
 * Cleans up house.
 *
 * @api private
 */

Request.prototype.cleanup = function(fromError){
  if ('undefined' == typeof this.xhr || null === this.xhr) {
    return;
  }
  // xmlhttprequest
  if (this.hasXDR()) {
    this.xhr.onload = this.xhr.onerror = empty;
  } else {
    this.xhr.onreadystatechange = empty;
  }

  if (fromError) {
    try {
      this.xhr.abort();
    } catch(e) {}
  }

  if (window.document) {
    delete Request.requests[this.index];
  }

  this.xhr = null;
};

/**
 * Called upon load.
 *
 * @api private
 */

Request.prototype.onLoad = function(){
  var data;
  try {
    var contentType;
    try {
      contentType = this.xhr.getResponseHeader('Content-Type').split(';')[0];
    } catch (e) {}
    if (contentType === 'application/octet-stream') {
      data = this.xhr.response;
    } else {
      if (!this.supportsBinary) {
        data = this.xhr.responseText;
      } else {
        data = String.fromCharCode.apply(null, new Uint8Array(this.xhr.response));
      }
    }

  } catch (e) {
    this.onError(e);
  }
  if (null != data) {
    this.onData(data);
  }
};

/**
 * Check if it has XDomainRequest.
 *
 * @api private
 */

Request.prototype.hasXDR = function(){
  return 'undefined' !== typeof window.XDomainRequest && !this.xs && this.enablesXDR;
};

/**
 * Aborts the request.
 *
 * @api public
 */

Request.prototype.abort = function(){
  this.cleanup();
};

/**
 * Aborts pending requests when unloading the window. This is needed to prevent
 * memory leaks (e.g. when using IE) and to ensure that no spurious error is
 * emitted.
 */


  Request.requestsCount = 0;
  Request.requests = {};
  if (window && window.attachEvent) {
    window.attachEvent('onunload', unloadHandler);
  } else if (window && window.addEventListener) {
    window.addEventListener('beforeunload', unloadHandler, false);
  }


function unloadHandler() {
  for (var i in Request.requests) {
    if (Request.requests.hasOwnProperty(i)) {
      Request.requests[i].abort();
    }
  }
}


});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_io/transports/polling.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {


	 	var latte_lib = require("latte_lib");
		var Transport = require('../transport');
		var parseqs = {
			encode : function (obj) {
			  var str = '';

			  for (var i in obj) {
			    if (obj.hasOwnProperty(i)) {
			      if (str.length) str += '&';
			      str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
			    }
			  }

			  return str;
			},
			decode : function(qs){
			  var qry = {};
			  var pairs = qs.split('&');
			  for (var i = 0, l = pairs.length; i < l; i++) {
			    var pair = pairs[i].split('=');
			    qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
			  }
			  return qry;
			}
		};
		var parser = require('../parser');
		var debug = latte_lib.debug.info;

		/**
		 * Module exports.
		 */

		module.exports = Polling;

		/**
		 * Is XHR2 supported?
		 */

		var hasXHR2 = (function() {
		  var XMLHttpRequest = window? window.XMLHttpRequest :require('../xmlhttprequest').XMLHttpRequest;
		  var xhr = new XMLHttpRequest({ xdomain: false });
		  return null != xhr.responseType;
		})();

		/**
		 * Polling interface.
		 *
		 * @param {Object} opts
		 * @api private
		 */

		function Polling(opts){
		  var forceBase64 = (opts && opts.forceBase64);
		  if (!hasXHR2 || forceBase64) {
		    this.supportsBinary = false;
		  }
		  Transport.call(this, opts);
		}
	 	latte_lib.inherits(Polling, Transport);

		(function() {
			this.name = "polling";
			this.doOpen = function() {
				this.poll();
			}
			this.pause = function(onPause){
			  var pending = 0;
			  var self = this;

			  this.readyState = 'pausing';

			  function pause(){
			    debug('paused');
			    self.readyState = 'paused';
			    onPause();
			  }

			  if (this.polling || !this.writable) {
			    var total = 0;

			    if (this.polling) {
			      debug('we are currently polling - waiting to pause');
			      total++;
			      this.once('pollComplete', function(){
			        debug('pre-pause polling complete');
			        --total || pause();
			      });
			    }

			    if (!this.writable) {
			      debug('we are currently writing - waiting to pause');
			      total++;
			      this.once('drain', function(){
			        debug('pre-pause writing complete');
			        --total || pause();
			      });
			    }
			  } else {
			    pause();
			  }
			};

			this.poll = function(){
			  debug('polling');
			  this.polling = true;
			  this.doPoll();
			  this.emit('poll');
			};

			this.onData = function(data){
			  var self = this;
			  debug('polling got data %s', data);
			  var callback = function(packet, index, total) {
			    // if its the first message we consider the transport open
			    if ('opening' == self.readyState) {
			      self.onOpen();
			    }

			    // if its a close packet, we close the ongoing requests
			    if ('close' == packet.type) {
			      self.onClose();
			      return false;
			    }

			    // otherwise bypass onData and handle the message
			    self.onPacket(packet);
			  };

			  // decode payload
			  parser.decodePayload(data, this.socket.binaryType, callback);

			  // if an event did not trigger closing
			  if ('closed' != this.readyState) {
			    // if we got data we're not polling
			    this.polling = false;
			    this.emit('pollComplete');

			    if ('open' == this.readyState) {
			      this.poll();
			    } else {
			      debug('ignoring poll - transport state "%s"', this.readyState);
			    }
			  }
			};

			this.doClose = function(){
			  var self = this;

			  function close(){
			    debug('writing close packet');
			    self.write([{ type: 'close' }]);
			  }

			  if ('open' == this.readyState) {
			    debug('transport open - closing');
			    close();
			  } else {
			    // in case we're trying to close while
			    // handshaking is in progress (GH-164)
			    debug('transport not open - deferring close');
			    this.once('open', close);
			  }
			};

			this.write = function(packets){
			  var self = this;
			  this.writable = false;
			  var callbackfn = function() {
			    self.writable = true;
			    self.emit('drain');
			  };

			  var self = this;
			  parser.encodePayload(packets, this.supportsBinary, function(data) {
			    self.doWrite(data, callbackfn);
			  });
			};

			this.uri = function(){
			  var query = this.query || {};
			  var schema = this.secure ? 'https' : 'http';
			  var port = '';

			  // cache busting is forced
			  if (false !== this.timestampRequests) {
			    query[this.timestampParam] = +new Date + '-' + Transport.timestamps++;
			  }

			  if (!this.supportsBinary && !query.sid) {
			    query.b64 = 1;
			  }

			  query = parseqs.encode(query);

			  // avoid port if default for schema
			  if (this.port && (('https' == schema && this.port != 443) ||
			     ('http' == schema && this.port != 80))) {
			    port = ':' + this.port;
			  }

			  // prepend ? to query
			  if (query.length) {
			    query = '?' + query;
			  }
			  return schema + '://' + this.hostname + port + this.path + query;
			};

		}).call(Polling.prototype);



});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_io/transports/websocket.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {


  var latte_lib = require("latte_lib");
  var Transport = require('../transport');
  var parser = require('../parser');
  var parseqs = {
        encode : function (obj) {
          var str = '';

          for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
              if (str.length) str += '&';
              str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
            }
          }

          return str;
        },
        decode : function(qs){
          var qry = {};
          var pairs = qs.split('&');
          for (var i = 0, l = pairs.length; i < l; i++) {
            var pair = pairs[i].split('=');
            qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
          }
          return qry;
        }
      };
  var latte_lib = require("latte_lib");
  var debug =latte_lib.debug.info;
	var WebSocket = window? window.WebSocket : require('ws');


  module.exports = WS;

    function WS(opts){
      var forceBase64 = (opts && opts.forceBase64);
      if (forceBase64) {
        this.supportsBinary = false;
      }
      this.perMessageDeflate = opts.perMessageDeflate;
      Transport.call(this, opts);
    }


    latte_lib.inherits(WS, Transport);
    (function() {
      this.name = "websocket";
      this.supportsBinary = true;
      this.doOpen = function(){
        if (!this.check()) {
          // let probe timeout
          return;
        }

        var self = this;
        var uri = this.uri();
        var protocols = void(0) ;
        var opts = {
          agent: this.agent,
          perMessageDeflate: this.perMessageDeflate
        };
					// SSL options for Node.js client
	        opts.pfx = this.pfx;
	        opts.key = this.key;
	        opts.passphrase = this.passphrase;
	        opts.cert = this.cert;
	        opts.ca = this.ca;
	        opts.ciphers = this.ciphers;
	        opts.rejectUnauthorized = this.rejectUnauthorized;
	        if (this.extraHeaders) {
	          opts.headers = this.extraHeaders;
	        }
					if ('undefined' != typeof navigator
						&& /iPad|iPhone|iPod/i.test(navigator.userAgent)) {
	        		this.ws = new WebSocket(uri);
					}else{
							this.ws = new WebSocket(uri, protocols, opts);
					}

	        if (this.ws.binaryType === undefined) {
	          this.supportsBinary = false;
	        }

	        this.ws.binaryType = 'arraybuffer';



        this.addEventListeners();
      };

      this.addEventListeners = function(){
        var self = this;
        this.ws.onopen = function(){
          self.onOpen();
        };
        this.ws.onclose = function(){
          self.onClose();
        };
        this.ws.onmessage = function(ev){
          self.onData(ev.data);
        };
        this.ws.onerror = function(e){
          self.onError('websocket error', e);
        };
      };

      this.write = function(packets){
        var self = this;
        this.writable = false;
        // encodePacket efficient as it uses WS framing
        // no need for encodePayload
        for (var i = 0, l = packets.length; i < l; i++) {
          var packet = packets[i];
          parser.encodePacket(packet, this.supportsBinary, function(data) {
            //Sometimes the websocket has already been closed but the browser didn't
            //have a chance of informing us about it yet, in that case send will
            //throw an error
            try {
              if (window  && window.WebSocket && self.ws instanceof window.WebSocket) {
                // TypeError is thrown when passing the second argument on Safari
                self.ws.send(data);
              } else {
                self.ws.send(data, packet.options);
              }
            } catch (e){

              debug('websocket closed before onclose event');
            }
          });
        }

        function ondrain() {
          self.writable = true;
          self.emit('drain');
        }
        // fake drain
        // defer to next tick to allow Socket to clear writeBuffer
        setTimeout(ondrain, 0);
      };

      this.onClose = function(){
        Transport.prototype.onClose.call(this);
      };

      this.doClose = function(){
        if (typeof this.ws !== 'undefined') {
          this.ws.close();
        }
      };

      this.uri = function(){
        var query = this.query || {};
        var schema = this.secure ? 'wss' : 'ws';
        var port = '';

        // avoid port if default for schema
        if (this.port && (('wss' == schema && this.port != 443)
          || ('ws' == schema && this.port != 80))) {
          port = ':' + this.port;
        }

        // append timestamp to URI
        if (this.timestampRequests) {
          query[this.timestampParam] = +new Date;
        }

        // communicate binary support capabilities
        if (!this.supportsBinary) {
          query.b64 = 1;
        }

        query = parseqs.encode(query);

        // prepend ? to query
        if (query.length) {
          query = '?' + query;
        }

        return schema + '://' + this.hostname + port + this.path + query;
      };

      this.check = function(){
        return !!WebSocket && !('__initialize' in WebSocket && this.name === WS.prototype.name);
      };
    }).call(WS.prototype);

    if(window) {
      if ('undefined' != typeof navigator
        && /iPad|iPhone|iPod/i.test(navigator.userAgent)) {
        WS.prototype.onData = function(data){
          var self = this;
          setTimeout(function(){
            Transport.prototype.onData.call(self, data);
          }, 0);
        };
      }
    }


	
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
(function(define) {'use strict'
define("latte_io/xmlhttprequest.js", ["require", "exports", "module", "window"],
function(require, exports, module, window) {


  // browser shim for xmlhttprequest module
  var hasCORS = window == null;
  /**
   * Wrapper for built-in http.js to emulate the browser XMLHttpRequest object.
   *
   * This can be used with JS designed for browsers to improve reuse of code and
   * allow the use of existing libraries.
   *
   * Usage: include("XMLHttpRequest.js") and use XMLHttpRequest per W3C specs.
   *
   * @author Dan DeFelippi <dan@driverdan.com>
   * @contributor David Ellis <d.f.ellis@ieee.org>
   * @license MIT
   */
   var XMLHttpRequest = window? window.XMLHttpRequest : null;
  if(!window) {


    var fs = require('fs');
    var Url = require('url');
    var spawn = require('child_process').spawn;

    /**
     * Module exports.
     */



    /**
     * `XMLHttpRequest` constructor.
     *
     * Supported options for the `opts` object are:
     *
     *  - `agent`: An http.Agent instance; http.globalAgent may be used; if 'undefined', agent usage is disabled
     *
     * @param {Object} opts optional "options" object
     */

    XMLHttpRequest = function (opts) {
      /**
       * Private variables
       */
      var self = this;
      var http = require('http');
      var https = require('https');

      // Holds http.js objects
      var request;
      var response;

      // Request settings
      var settings = {};

      // Disable header blacklist.
      // Not part of XHR specs.
      var disableHeaderCheck = false;

      // Set some default headers
      var defaultHeaders = {
        "User-Agent": "node-XMLHttpRequest",
        "Accept": "*/*"
      };

      var headers = defaultHeaders;

      // These headers are not user setable.
      // The following are allowed but banned in the spec:
      // * user-agent
      var forbiddenRequestHeaders = [
        "accept-charset",
        "accept-encoding",
        "access-control-request-headers",
        "access-control-request-method",
        "connection",
        "content-length",
        "content-transfer-encoding",
        "cookie",
        "cookie2",
        "date",
        "expect",
        "host",
        "keep-alive",
        "origin",
        "referer",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade",
        "via"
      ];

      // These request methods are not allowed
      var forbiddenRequestMethods = [
        "TRACE",
        "TRACK",
        "CONNECT"
      ];

      // Send flag
      var sendFlag = false;
      // Error flag, used when errors occur or abort is called
      var errorFlag = false;

      // Event listeners
      var listeners = {};

      /**
       * Constants
       */

      this.UNSENT = 0;
      this.OPENED = 1;
      this.HEADERS_RECEIVED = 2;
      this.LOADING = 3;
      this.DONE = 4;

      /**
       * Public vars
       */

      // Current state
      this.readyState = this.UNSENT;

      // default ready state change handler in case one is not set or is set late
      this.onreadystatechange = null;

      // Result & response
      this.responseText = "";
      this.responseXML = "";
      this.status = null;
      this.statusText = null;

      /**
       * Private methods
       */

      /**
       * Check if the specified header is allowed.
       *
       * @param string header Header to validate
       * @return boolean False if not allowed, otherwise true
       */
      var isAllowedHttpHeader = function(header) {
        return disableHeaderCheck || (header && forbiddenRequestHeaders.indexOf(header.toLowerCase()) === -1);
      };

      /**
       * Check if the specified method is allowed.
       *
       * @param string method Request method to validate
       * @return boolean False if not allowed, otherwise true
       */
      var isAllowedHttpMethod = function(method) {
        return (method && forbiddenRequestMethods.indexOf(method) === -1);
      };

      /**
       * Public methods
       */

      /**
       * Open the connection. Currently supports local server requests.
       *
       * @param string method Connection method (eg GET, POST)
       * @param string url URL for the connection.
       * @param boolean async Asynchronous connection. Default is true.
       * @param string user Username for basic authentication (optional)
       * @param string password Password for basic authentication (optional)
       */
      this.open = function(method, url, async, user, password) {
        this.abort();
        errorFlag = false;

        // Check for valid request method
        if (!isAllowedHttpMethod(method)) {
          throw "SecurityError: Request method not allowed";
        }

        settings = {
          "method": method,
          "url": url.toString(),
          "async": (typeof async !== "boolean" ? true : async),
          "user": user || null,
          "password": password || null
        };

        setState(this.OPENED);
      };

      /**
       * Disables or enables isAllowedHttpHeader() check the request. Enabled by default.
       * This does not conform to the W3C spec.
       *
       * @param boolean state Enable or disable header checking.
       */
      this.setDisableHeaderCheck = function(state) {
        disableHeaderCheck = state;
      };

      /**
       * Sets a header for the request.
       *
       * @param string header Header name
       * @param string value Header value
       */
      this.setRequestHeader = function(header, value) {
        if (this.readyState != this.OPENED) {
          throw "INVALID_STATE_ERR: setRequestHeader can only be called when state is OPEN";
        }
        if (!isAllowedHttpHeader(header)) {
          console.warn('Refused to set unsafe header "' + header + '"');
          return;
        }
        if (sendFlag) {
          throw "INVALID_STATE_ERR: send flag is true";
        }
        headers[header] = value;
      };

      /**
       * Gets a header from the server response.
       *
       * @param string header Name of header to get.
       * @return string Text of the header or null if it doesn't exist.
       */
      this.getResponseHeader = function(header) {
        if (typeof header === "string"
          && this.readyState > this.OPENED
          && response.headers[header.toLowerCase()]
          && !errorFlag
        ) {
          return response.headers[header.toLowerCase()];
        }

        return null;
      };

      /**
       * Gets all the response headers.
       *
       * @return string A string with all response headers separated by CR+LF
       */
      this.getAllResponseHeaders = function() {
        if (this.readyState < this.HEADERS_RECEIVED || errorFlag) {
          return "";
        }
        var result = "";

        for (var i in response.headers) {
          // Cookie headers are excluded
          if (i !== "set-cookie" && i !== "set-cookie2") {
            result += i + ": " + response.headers[i] + "\r\n";
          }
        }
        return result.substr(0, result.length - 2);
      };

      /**
       * Gets a request header
       *
       * @param string name Name of header to get
       * @return string Returns the request header or empty string if not set
       */
      this.getRequestHeader = function(name) {
        // @TODO Make this case insensitive
        if (typeof name === "string" && headers[name]) {
          return headers[name];
        }

        return "";
      };

      /**
       * Sends the request to the server.
       *
       * @param string data Optional data to send as request body.
       */
      this.send = function(data) {
        if (this.readyState != this.OPENED) {
          throw "INVALID_STATE_ERR: connection must be opened before send() is called";
        }

        if (sendFlag) {
          throw "INVALID_STATE_ERR: send has already been called";
        }

        var ssl = false, local = false;
        var url = Url.parse(settings.url);
        var host;
        // Determine the server
        switch (url.protocol) {
          case 'https:':
            ssl = true;
            // SSL & non-SSL both need host, no break here.
          case 'http:':
            host = url.hostname;
            break;

          case 'file:':
            local = true;
            break;

          case undefined:
          case '':
            host = "localhost";
            break;

          default:
            throw "Protocol not supported.";
        }

        // Load files off the local filesystem (file://)
        if (local) {
          if (settings.method !== "GET") {
            throw "XMLHttpRequest: Only GET method is supported";
          }

          if (settings.async) {
            fs.readFile(url.pathname, 'utf8', function(error, data) {
              if (error) {
                self.handleError(error);
              } else {
                self.status = 200;
                self.responseText = data;
                setState(self.DONE);
              }
            });
          } else {
            try {
              this.responseText = fs.readFileSync(url.pathname, 'utf8');
              this.status = 200;
              setState(self.DONE);
            } catch(e) {
              this.handleError(e);
            }
          }

          return;
        }

        // Default to port 80. If accessing localhost on another port be sure
        // to use http://localhost:port/path
        var port = url.port || (ssl ? 443 : 80);
        // Add query string if one is used
        var uri = url.pathname + (url.search ? url.search : '');

        // Set the Host header or the server may reject the request
        headers["Host"] = host;
        if (!((ssl && port === 443) || port === 80)) {
          headers["Host"] += ':' + url.port;
        }

        // Set Basic Auth if necessary
        if (settings.user) {
          if (typeof settings.password == "undefined") {
            settings.password = "";
          }
          var authBuf = new Buffer(settings.user + ":" + settings.password);
          headers["Authorization"] = "Basic " + authBuf.toString("base64");
        }

        // Set content length header
        if (settings.method === "GET" || settings.method === "HEAD") {
          data = null;
        } else if (data) {
          headers["Content-Length"] = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);

          if (!headers["Content-Type"]) {
            headers["Content-Type"] = "text/plain;charset=UTF-8";
          }
        } else if (settings.method === "POST") {
          // For a post with no data set Content-Length: 0.
          // This is required by buggy servers that don't meet the specs.
          headers["Content-Length"] = 0;
        }

        var agent = false;
        if (opts && opts.agent) {
          agent = opts.agent;
        }
        var options = {
          host: host,
          port: port,
          path: uri,
          method: settings.method,
          headers: headers,
          agent: agent
        };

        if (ssl) {
          options.pfx = opts.pfx;
          options.key = opts.key;
          options.passphrase = opts.passphrase;
          options.cert = opts.cert;
          options.ca = opts.ca;
          options.ciphers = opts.ciphers;
          options.rejectUnauthorized = opts.rejectUnauthorized;
        }

        // Reset error flag
        errorFlag = false;

        // Handle async requests
        if (settings.async) {
          // Use the proper protocol
          var doRequest = ssl ? https.request : http.request;

          // Request is being sent, set send flag
          sendFlag = true;

          // As per spec, this is called here for historical reasons.
          self.dispatchEvent("readystatechange");

          // Handler for the response
          var responseHandler = function (resp) {
            // Set response var to the response we got back
            // This is so it remains accessable outside this scope
            response = resp;
            // Check for redirect
            // @TODO Prevent looped redirects
            if (response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307) {
              // Change URL to the redirect location
              settings.url = response.headers.location;
              var url = Url.parse(settings.url);
              // Set host var in case it's used later
              host = url.hostname;
              // Options for the new request
              var newOptions = {
                hostname: url.hostname,
                port: url.port,
                path: url.path,
                method: response.statusCode === 303 ? 'GET' : settings.method,
                headers: headers
              };

              if (ssl) {
                options.pfx = opts.pfx;
                options.key = opts.key;
                options.passphrase = opts.passphrase;
                options.cert = opts.cert;
                options.ca = opts.ca;
                options.ciphers = opts.ciphers;
                options.rejectUnauthorized = opts.rejectUnauthorized;
              }

              // Issue the new request
              request = doRequest(newOptions, responseHandler).on('error', errorHandler);
              request.end();
              // @TODO Check if an XHR event needs to be fired here
              return;
            }

            response.setEncoding("utf8");

            setState(self.HEADERS_RECEIVED);
            self.status = response.statusCode;

            response.on('data', function(chunk) {
              // Make sure there's some data
              if (chunk) {
                self.responseText += chunk;
              }
              // Don't emit state changes if the connection has been aborted.
              if (sendFlag) {
                setState(self.LOADING);
              }
            });

            response.on('end', function() {
              if (sendFlag) {
                // Discard the 'end' event if the connection has been aborted
                setState(self.DONE);
                sendFlag = false;
              }
            });

            response.on('error', function(error) {
              self.handleError(error);
            });
          }

          // Error handler for the request
          var errorHandler = function (error) {
            self.handleError(error);
          }

          // Create the request
          request = doRequest(options, responseHandler).on('error', errorHandler);

          // Node 0.4 and later won't accept empty data. Make sure it's needed.
          if (data) {
            request.write(data);
          }

          request.end();

          self.dispatchEvent("loadstart");
        } else { // Synchronous
          // Create a temporary file for communication with the other Node process
          var contentFile = ".node-xmlhttprequest-content-" + process.pid;
          var syncFile = ".node-xmlhttprequest-sync-" + process.pid;
          fs.writeFileSync(syncFile, "", "utf8");
          // The async request the other Node process executes
          var execString = "var http = require('http'), https = require('https'), fs = require('fs');"
            + "var doRequest = http" + (ssl ? "s" : "") + ".request;"
            + "var options = " + JSON.stringify(options) + ";"
            + "var responseText = '';"
            + "var req = doRequest(options, function(response) {"
            + "response.setEncoding('utf8');"
            + "response.on('data', function(chunk) {"
            + "  responseText += chunk;"
            + "});"
            + "response.on('end', function() {"
            + "fs.writeFileSync('" + contentFile + "', 'NODE-XMLHTTPREQUEST-STATUS:' + response.statusCode + ',' + responseText, 'utf8');"
            + "fs.unlinkSync('" + syncFile + "');"
            + "});"
            + "response.on('error', function(error) {"
            + "fs.writeFileSync('" + contentFile + "', 'NODE-XMLHTTPREQUEST-ERROR:' + JSON.stringify(error), 'utf8');"
            + "fs.unlinkSync('" + syncFile + "');"
            + "});"
            + "}).on('error', function(error) {"
            + "fs.writeFileSync('" + contentFile + "', 'NODE-XMLHTTPREQUEST-ERROR:' + JSON.stringify(error), 'utf8');"
            + "fs.unlinkSync('" + syncFile + "');"
            + "});"
            + (data ? "req.write('" + data.replace(/'/g, "\\'") + "');":"")
            + "req.end();";
          // Start the other Node Process, executing this string
          var syncProc = spawn(process.argv[0], ["-e", execString]);
          var statusText;
          while(fs.existsSync(syncFile)) {
            // Wait while the sync file is empty
          }
          self.responseText = fs.readFileSync(contentFile, 'utf8');
          // Kill the child process once the file has data
          syncProc.stdin.end();
          // Remove the temporary file
          fs.unlinkSync(contentFile);
          if (self.responseText.match(/^NODE-XMLHTTPREQUEST-ERROR:/)) {
            // If the file returned an error, handle it
            var errorObj = self.responseText.replace(/^NODE-XMLHTTPREQUEST-ERROR:/, "");
            self.handleError(errorObj);
          } else {
            // If the file returned okay, parse its data and move to the DONE state
            self.status = self.responseText.replace(/^NODE-XMLHTTPREQUEST-STATUS:([0-9]*),.*/, "$1");
            self.responseText = self.responseText.replace(/^NODE-XMLHTTPREQUEST-STATUS:[0-9]*,(.*)/, "$1");
            setState(self.DONE);
          }
        }
      };

      /**
       * Called when an error is encountered to deal with it.
       */
      this.handleError = function(error) {
        this.status = 503;
        this.statusText = error;
        this.responseText = error.stack;
        errorFlag = true;
        setState(this.DONE);
      };

      /**
       * Aborts a request.
       */
      this.abort = function() {
        if (request) {
          request.abort();
          request = null;
        }

        headers = defaultHeaders;
        this.responseText = "";
        this.responseXML = "";

        errorFlag = true;

        if (this.readyState !== this.UNSENT
            && (this.readyState !== this.OPENED || sendFlag)
            && this.readyState !== this.DONE) {
          sendFlag = false;
          setState(this.DONE);
        }
        this.readyState = this.UNSENT;
      };

      /**
       * Adds an event listener. Preferred method of binding to events.
       */
      this.addEventListener = function(event, callback) {
        if (!(event in listeners)) {
          listeners[event] = [];
        }
        // Currently allows duplicate callbacks. Should it?
        listeners[event].push(callback);
      };

      /**
       * Remove an event callback that has already been bound.
       * Only works on the matching funciton, cannot be a copy.
       */
      this.removeEventListener = function(event, callback) {
        if (event in listeners) {
          // Filter will return a new array with the callback removed
          listeners[event] = listeners[event].filter(function(ev) {
            return ev !== callback;
          });
        }
      };

      /**
       * Dispatch any events, including both "on" methods and events attached using addEventListener.
       */
      this.dispatchEvent = function(event) {
        if (typeof self["on" + event] === "function") {
          self["on" + event]();
        }
        if (event in listeners) {
          for (var i = 0, len = listeners[event].length; i < len; i++) {
            listeners[event][i].call(self);
          }
        }
      };

      /**
       * Changes readyState and calls onreadystatechange.
       *
       * @param int state New state
       */
      var setState = function(state) {
        if (self.readyState !== state) {
          self.readyState = state;

          if (settings.async || self.readyState < self.OPENED || self.readyState === self.DONE) {
            self.dispatchEvent("readystatechange");
          }

          if (self.readyState === self.DONE && !errorFlag) {
            self.dispatchEvent("load");
            // @TODO figure out InspectorInstrumentation::didLoadXHR(cookie)
            self.dispatchEvent("loadend");
          }
        }
      };
    };
  };
    module.exports = function(opts) {
      var xdomain = opts.xdomain;

      // scheme must be same when usign XDomainRequest
      // http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx
      var xscheme = opts.xscheme;

      // XDomainRequest has a flow of not sending cookie, therefore it should be disabled as a default.
      // https://github.com/Automattic/engine.io-client/pull/217
      var enablesXDR = opts.enablesXDR;

      // XMLHttpRequest can be disabled on IE
      try {
        if ('undefined' != typeof XMLHttpRequest && (!xdomain || hasCORS)) {
          return new XMLHttpRequest();
        }
      } catch (e) { }

      // Use XDomainRequest for IE8 if enablesXDR is true
      // because loading bar keeps flashing when using jsonp-polling
      // https://github.com/yujiosaka/socke.io-ie8-loading-example
      try {
        if ('undefined' != typeof XDomainRequest && !xscheme && enablesXDR) {
          return new XDomainRequest();
        }
      } catch (e) { }

      if (!xdomain) {
        try {
          return new ActiveXObject('Microsoft.XMLHTTP');
        } catch(e) { }
      }
    }

    // backwards-compat
    module.exports.XMLHttpRequest = XMLHttpRequest;
 
});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });