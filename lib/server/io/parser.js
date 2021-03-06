(function(define) { 'use strict';
	define("latte_web/io/parser", ["require", "exports", "module", "window"],
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


	});
})(typeof define === "function"? define: function(name, reqs, factory) { factory(require, exports, module); });
