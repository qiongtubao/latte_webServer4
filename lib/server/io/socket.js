(function(define) { 'use strict';
	define("latte_web/io/socket", ["require", "exports", "module", "window"],
	function(require, exports, module, window) {
		var latte_lib = require("latte_lib")
			,debug = latte_lib.debug.info;
		module.exports = Socket;
		function Socket (id, server, transport, req) {
		  this.id = id;
		  this.server = server;
		  this.upgraded = false;
		  this.readyState = 'opening';
		  this.writeBuffer = [];
		  this.packetsFn = [];
		  this.sentCallbackFn = [];
		  this.request = req;

		  // Cache IP since it might not be in the req later
		  this.remoteAddress = req.connection.remoteAddress;

		  this.checkIntervalTimer = null;
		  this.upgradeTimeoutTimer = null;
		  this.pingTimeoutTimer = null;

		  this.setTransport(transport);
		  this.onOpen();
		}

		/**
		 * Inherits from EventEmitter.
		 */

		latte_lib.inherits(Socket, latte_lib.events);

		(function() {
			this.onOpen = function () {
			  this.readyState = 'open';

			  // sends an `open` packet
			  this.transport.sid = this.id;
			  this.sendPacket('open', JSON.stringify({
			      sid: this.id
			    , upgrades: this.getAvailableUpgrades()
			    , pingInterval: this.server.pingInterval
			    , pingTimeout: this.server.pingTimeout
			  }));

			  this.emit('open');
			  this.setPingTimeout();
			};

			this.onPacket = function (packet) {
			  if ('open' == this.readyState) {
			    // export packet event
			    debug('packet');
			    this.emit('packet', packet);

			    // Reset ping timeout on any packet, incoming data is a good sign of
			    // other side's liveness
			    this.setPingTimeout();

			    switch (packet.type) {

			      case 'ping':
			        debug('got ping');
			        this.sendPacket('pong');
			        this.emit('heartbeat');
			        break;

			      case 'error':
			        this.onClose('parse error');
			        break;

			      case 'message':
			        this.emit('data', packet.data);
			        
			        this.emit('message', packet.data);
			        break;
			    }
			  } else {
			    debug('packet received with closed socket');
			  }
			};
			this.onError = function (err) {
			  debug('transport error');
			  this.onClose('transport error', err);
			};
			this.setPingTimeout = function () {
			  var self = this;
			  clearTimeout(self.pingTimeoutTimer);
			  self.pingTimeoutTimer = setTimeout(function () {
			    self.onClose('ping timeout');
			  }, self.server.pingInterval + self.server.pingTimeout);
			};
			this.setTransport = function (transport) {
			  this.transport = transport;
			  this.transport.once('error', this.onError.bind(this));
			  this.transport.on('packet', this.onPacket.bind(this));
			  this.transport.on('drain', this.flush.bind(this));
			  this.transport.once('close', this.onClose.bind(this, 'transport close'));
			  //this function will manage packet events (also message callbacks)
			  this.setupSendCallback();
			};

			this.maybeUpgrade = function (transport) {
			  debug('might upgrade socket transport from "%s" to "%s"'
			    , this.transport.name, transport.name);

			  var self = this;

			  // set transport upgrade timer
			  self.upgradeTimeoutTimer = setTimeout(function () {
			    debug('client did not complete upgrade - closing transport');
			    clearInterval(self.checkIntervalTimer);
			    self.checkIntervalTimer = null;
			    if ('open' == transport.readyState) {
			      transport.close();
			    }
			  }, this.server.upgradeTimeout);

			  function onPacket(packet){
			    if ('ping' == packet.type && 'probe' == packet.data) {
			      transport.send([{ type: 'pong', data: 'probe', options: { compress: true } }]);
			      clearInterval(self.checkIntervalTimer);
			      self.checkIntervalTimer = setInterval(check, 100);
			    } else if ('upgrade' == packet.type && self.readyState != 'closed') {
			      debug('got upgrade packet - upgrading');
			      self.upgraded = true;
			      self.clearTransport();
			      self.setTransport(transport);
			      self.emit('upgrade', transport);
			      self.setPingTimeout();
			      self.flush();
			      clearInterval(self.checkIntervalTimer);
			      self.checkIntervalTimer = null;
			      clearTimeout(self.upgradeTimeoutTimer);
			      transport.removeListener('packet', onPacket);
			      if (self.readyState == 'closing') {
			        transport.close(function () {
			          self.onClose('forced close');
			        });
			      }
			    } else {
			      transport.close();
			    }
			  }

			  // we force a polling cycle to ensure a fast upgrade
			  function check(){
			    if ('polling' == self.transport.name && self.transport.writable) {
			      debug('writing a noop packet to polling for fast upgrade');
			      self.transport.send([{ type: 'noop', options: { compress: true } }]);
			    }
			  }
			  transport.on('packet', onPacket);
			};

			this.clearTransport = function () {
			  // silence further transport errors and prevent uncaught exceptions
			  this.transport.on('error', function(){
			    debug('error triggered by discarded transport');
			  });
			  clearTimeout(this.pingTimeoutTimer);
			};

			this.onClose = function (reason, description) {
			  if ('closed' != this.readyState) {
			    clearTimeout(this.pingTimeoutTimer);
			    clearInterval(this.checkIntervalTimer);
			    this.checkIntervalTimer = null;
			    clearTimeout(this.upgradeTimeoutTimer);
			    var self = this;
			    // clean writeBuffer in next tick, so developers can still
			    // grab the writeBuffer on 'close' event
			    process.nextTick(function() {
			      self.writeBuffer = [];
			    });
			    this.packetsFn = [];
			    this.sentCallbackFn = [];
			    this.clearTransport();
			    this.readyState = 'closed';
			    this.emit('close', reason, description);
			  }
			};

			this.setupSendCallback = function () {
			  var self = this;
			  //the message was sent successfully, execute the callback
			  this.transport.on('drain', function() {
			    if (self.sentCallbackFn.length > 0) {
			      var seqFn = self.sentCallbackFn.splice(0,1)[0];
			      if ('function' == typeof seqFn) {
			        debug('executing send callback');
			        seqFn(self.transport);
			      } else if (Array.isArray(seqFn)) {
			        debug('executing batch send callback');
			        for (var l = seqFn.length, i = 0; i < l; i++) {
			          if ('function' == typeof seqFn[i]) {
			            seqFn[i](self.transport);
			          }
			        }
			      }
			    }
			  });
			};

			this.send =
			this.write = function(data, options, callback){
			  this.sendPacket('message', data, options, callback);
			  return this;
			};

			this.sendPacket = function (type, data, options, callback) {
			  if ('function' == typeof options) {
			    callback = options;
			    options = null;
			  }

			  options = options || {};
			  options.compress = false !== options.compress;

			  if ('closing' != this.readyState) {
			    //debug('sending packet "%s" (%s)', type, data);

			    var packet = {
			      type: type,
			      options: options
			    };
			    if (data) packet.data = data;
			    // exports packetCreate event
			    this.emit('packetCreate', packet);

			    this.writeBuffer.push(packet);

			    //add send callback to object
			    this.packetsFn.push(callback);

			    this.flush();
			  }
			};

			this.flush = function () {
			  if ('closed' != this.readyState && this.transport.writable
			    && this.writeBuffer.length) {
			    debug('flushing buffer to transport');
			    this.emit('flush', this.writeBuffer);
			    this.server.emit('flush', this, this.writeBuffer);
			    var wbuf = this.writeBuffer;
			    this.writeBuffer = [];
			    if (!this.transport.supportsFraming) {
			      this.sentCallbackFn.push(this.packetsFn);
			    } else {
			      this.sentCallbackFn.push.apply(this.sentCallbackFn, this.packetsFn);
			    }
			    this.packetsFn = [];
			    this.transport.send(wbuf);
			    this.emit('drain');
			    this.server.emit('drain', this);
			  }
			};

			this.getAvailableUpgrades = function () {
			  var availableUpgrades = [];
			  var allUpgrades = this.server.upgrades(this.transport.name);
			  for (var i = 0, l = allUpgrades.length; i < l; ++i) {
			    var upg = allUpgrades[i];
			    if (this.server.transports.indexOf(upg) != -1) {

			      availableUpgrades.push(upg);
			    }
			  }
			  return availableUpgrades;
			};

			this.close = function () {
			  if ('open' != this.readyState) return;

			  this.readyState = 'closing';

			  if (this.writeBuffer.length) {
			    this.once('drain', this.closeTransport.bind(this));
			    return;
			  }

			  this.closeTransport();
			};

			this.closeTransport = function () {
			  this.transport.close(this.onClose.bind(this, 'forced close'));
			};
		}).call(Socket.prototype);

	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
