var sp = require('serialport'),
    SerialPort = sp.SerialPort,
    serialport;

// Kicks off the event queue on success
exports.init = function serialInit(socket) {
  socket.on('message', function(inmessage) {
    var message = JSON.parse(inmessage);
    console.log(JSON.stringify(message));

    if (typeof message !== 'undefined' &&
        typeof message.method !== 'undefined' &&
        typeof message.data !== 'undefined') {
        
        if (message.method === 'echo') {
          console.log('echo ' + message.data);
          socket.emit('message',{method:'echo', data:message.data});
        } else if (message.method === 'list') {
          SerialPort.list(function (err, ports) {
            var portNames = [];
            ports.forEach(function(port) {
              console.log(port.comName);
              portNames.push(port.comName);
              //console.log(port.pnpId);
              //console.log(port.manufacturer);
            });

            socket.emit('message',{method:'list', data:portNames});
          });
        } else if (message.method === 'openserial') {
          console.log('openserial ' + message.method);
            
          try {
            serialport = new SerialPort(message.data.serialport, 
              message.data.serialoptions);
            serialport.open(function (error) {
              if ( error ) {
                  console.log(error);
                  socket.emit('mesage',{method:'error', data:error});
              } else {
                  console.log('open');
                  socket.emit('message',{method:'openserial',data:{}});

                serialport.on('data', function(data) {
                  console.log('data received: ' + data);
                  socket.emit('message',{method:'data',data:data});
                });

                serialport.on('close', function(data) {
                  console.log('close ' + data);
                  socket.emit('message',{method: 'close', data:data});
                  // Do we want to close the connection?
                });

                serialport.on('error', function(data) {
                  console.log('error ' + data);
                  socket.emit('message',{method: 'error', data:data});
                }); 
              }
              });         
          } catch (er) {
              console.log(er);
              socket.emit('message',{method: 'error', data:er});
          }
          //ws.send() // Send confirmation back
        } else if (message.method === 'write') {
          console.log('write ' + message.data);
          serialport.write(message.data);
        } else if (message.method === 'close') {
          console.log('close');
          if (serialport.isOpen()) {
            serialport.close(
              function(error) {
                console.log('Close Error: ' + error);
                socket.emit('message',{method:'error', data:error});
              }
            );
            socket.emit('message',{method: 'close', data:{}});
          }
        }
    }
    else {
      console.log('Not a message I understand: ' + JSON.stringify(message));
    }    
  });
};

