//var utils = require('./socket_utils.js'),
//    socket = utils.socket,
//var serialObj = {};

/**
 * Serial does not work along the same methods as Firmata-dependent
 * board funcs. It is therefore attached to the top-level p5 Object.
 *
 * @return {Object} Constructed serial instance
 */
var serial = function(_hostname, _serverport) {

  var self = this;

  this.serialBuffer = [];

  this.serialConnected = false;  // Is serial connected?

  this.serialport = null;
  this.serialoptions = null;

  if (typeof _hostname === 'string') {
    this.hostname = _hostname;
  } else {
    this.hostname = 'localhost';
  }

  if (typeof _serverport === 'number') {
    this.serverport = _serverport;
  } else {
    this.serverport = 8000;
  }

  this.socket = io.connect('http://'+this.hostname+':'+
    this.serverport+'/sensors');

  this.socket.on('error', function(err) {
      console.log(err);
      if (typeof self.errorCallback !== 'undefined') {
        self.errorCallback('Couldn\'t connect to the server, is it running?');
      }
  });

  this.socket.on('connect', function(event) {
    if (typeof self.connectedCallback !== 'undefined') {
      self.connectedCallback();
    }

    if (typeof self.serialport !== 'undefined' &&
      typeof self.serialoptions !== 'undefined') {
      /*
          If they have asked for a connect, these
          won't be null and we should try the connect now
          Trying to hide the async nature of the
          server connection and just deal with
          the async nature of serial for the end user
       */
      self.emit({method:'openserial',
        data:{serialport:self.serialport,serialoptions:self.serialoptions}});
    }
  });

  // Generic websocket message
  this.socket.on('message', function(event) {
      //console.log("socketOnMessage");
      //console.log(event);

      var messageObject = JSON.parse(event.data);

      // MESSAGE ROUTING
      if (typeof messageObject.method !== 'undefined') {
        if (messageObject.method === 'echo') {
          // Do something
        } else if (messageObject.method === 'openserial') {
          if (typeof self.openCallback !== 'undefined') {
            self.openCallback();
          }
        } else if (messageObject.method === 'data') {
          // Add to buffer, assuming this comes byte by byte
          //console.log("data: " + messageObject.data);
          for (var i = 0; i < messageObject.data.length; i++) {
            self.serialBuffer.push(messageObject.data[i]);
          }

          if (typeof self.dataCallback !== 'undefined') {
            // Hand it to sketch
            self.dataCallback(messageObject.data);
          }
        } else if (messageObject.method === 'list') {
          if (typeof self.listCallback !== 'undefined') {
            self.listCallback(messageObject.data);
          }
        } else if (messageObject.method === 'write') {
          // Success Callback?
        } else if (messageObject.method === 'error') {
          //console.log(messageObject.data);

          if (typeof self.errorCallback !== 'undefined') {
            // Hand it to sketch
            self.errorCallback(messageObject.data);
          }
        } else {
            // Got message from server without known method
            console.log('Unknown Method: ' + messageObject);
        }
      } else {
        console.log('Method Undefined: ' + messageObject);
      }
    });

    this.socket.on('disconnect', function(event) {
      //console.log("socketOnClose");
      //console.log(event);

      if (typeof self.closeCallback !== 'undefined') {
        self.closeCallback();
      }
    });

  this.emit = function(data) {
    this.socket.send(JSON.stringify(data));
  };

  // list() - list serial ports available to the server
  this.list = function() {
    //console.log("p5.SerialPort.list");
    this.emit({method:'list',data:{}});
  };

  this.open = function(_serialport, _serialoptions) {
    this.serialport = _serialport;

    if (typeof _serialoptions === 'object') {
      this.serialoptions = _serialoptions;
    }
    else {
      this.serialoptions = {};
    }

    // If our socket is connected, we'll do this now, 
    //otherwise it will happen in the socket.onopen callback
    //if (this.socket.readyState == WebSocket.OPEN) {
      this.emit({method:'openserial',
        data:{serialport:this.serialport,serialoptions:this.serialoptions}});
    //}
  };

  this.write = function(data) {
      //Writes bytes, chars, ints, bytes[], Strings to the serial port
      
      this.emit({method:'write',data:data});
      //this.socket.send({method:'writeByte',data:data});  ? 
      //this.socket.send({method:'writeString',data:data})  ?
  };

  this.read = function() {
    /*
    Returns a number between 0 and 255 for the next byte that's 
    waiting in the buffer. Returns -1 if there is no byte, although 
    this should be avoided by first cheacking 
    available() to see if data is available.
    */
    if (this.serialBuffer.length > 0) {
      return this.serialBuffer.shift();
    } else {
      return -1;
    }
  };

  this.readChar = function() {
    /*
    Returns the next byte in the buffer as a char. 
    Returns -1 or 0xffff if nothing is there.
    */
    if (this.serialBuffer.length > 0) {
      return String.fromCharCode(this.serialBuffer.shift());
    } else {
      return -1;
    }
  };

  this.readBytes = function() {
    if (this.serialBuffer.length > 0) {
      var returnBuffer = this.serialBuffer.slice();

      // Clear the array
      this.serialBuffer.length = 0;

      return returnBuffer;
    } else {
      return -1;
    }
  };

  this.readBytesUntil = function(charToFind) {
    /*
    Reads from the port into a buffer of bytes up to and 
    including a particular character. If the character 
    isn't in the buffer, 'null' is returned. The version 
    with without the byteBuffer parameter returns a byte 
    array of all data up to and including the interesting byte. 
    This is not efficient, but is easy to use. 
    The version with the byteBuffer parameter is more memory 
    and time efficient. It grabs the data in the buffer and 
    puts it into the byte array passed in and returns an int 
    value for the number of bytes read. If the byte buffer is 
    not large enough, -1 is returned and an error is printed 
    to the message area. If nothing is in the buffer, 0 is returned.
    */
    var index = this.serialBuffer.indexOf(charToFind.charCodeAt(0));
    if (index !== -1) {
      // What to return
      var returnBuffer = this.serialBuffer.slice(0,index+1);
      // Clear out what was returned
      this.serialBuffer = this.serialBuffer.slice(index,
        this.serialBuffer.length + index);
      return returnBuffer;
    } else {
      return -1;
    }
  };

  this.readString = function() {
    /*
    Returns all the data from the buffer as a String. 
    This method assumes the incoming characters are 
    ASCII. If you want to transfer Unicode data, 
    first convert the String to a byte stream in 
    the representation of your choice 
    (i.e. UTF8 or two-byte Unicode data), and 
    send it as a byte array.
    */
    //var returnBuffer = this.serialBuffer;
    var stringBuffer = [];
    //console.log("serialBuffer Length: " + this.serialBuffer.length);
    for (var i = 0; i < this.serialBuffer.length; i++) {
      //console.log("push: " + String.fromCharCode(this.serialBuffer[i]));
      stringBuffer.push(String.fromCharCode(this.serialBuffer[i]));
    }
    // Clear the buffer
    this.serialBuffer.length = 0;
    return stringBuffer.join('');
  };

  this.readStringUntil = function(charToFind) {
    /*
    Combination of readBytesUntil() and readString(). 
    Returns null if it doesn't find what you're looking for.
    */
    var returnBuffer = this.readBytesUntil(charToFind);
    if (returnBuffer !== -1) {
      var stringBuffer = [];
      for (var i = 0; i < this.serialBuffer.length; i++) {  
        stringBuffer.push(String.fromCharCode(returnBuffer[i]));
      }
      return stringBuffer.join('');
    }
    else {
      return returnBuffer;
    }
  };

  // TODO
  //p5.SerialPort.prototype.bufferUntil
  //p5.SerialPort.prototype.buffer

  this.available = function() {
    //return size of buffer
    return this.serialBuffer.length;
  };

  // TODO: This doesn't seem to be shortening the array
  this.last = function() {
    //Returns last byte received
    return this.serialBuffer.pop();
  };

  // TODO: This doesn't seem to be shortening the array
  this.lastChar = function() {
    //Returns the last byte received as a char.
    return String.fromCharCode(this.last());
  };

  // TODO: This isn't working
  this.clear = function() {
    //Empty the buffer, removes all the data stored there.
    this.serialBuffer.length = 0;
  };

  this.stop = function() {
    /*
    Stops data communication on this port. 
    Use to shut the connection when you're 
    finished with the Serial.
    */
    // TODO
  };

  this.close = function() {
    // Tell server to close port
    this.emit({method:'close',data:{}});
  };

  // Register callback methods from sketch
  this.on = function(_event, _callback) {
    if (_event === 'open') {
      this.openCallback = _callback;
    } else if (_event === 'data') {
      this.dataCallback = _callback;
    } else if (_event === 'close') {
      this.closeCallback = _callback;
    } else if (_event === 'error') {
      this.errorCallback = _callback;
    } else if (_event === 'list') {
      this.listCallback = _callback;
    } else if (_event === 'connected') {
      this.connectedCallback = _callback;
    }
  };

};



module.exports = serial;