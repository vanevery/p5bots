suite('Serial', function() {
  var serial = p5.serial();
  //console.log(JSON.stringify(serial));

  test('methods are defined', function() {
    assert.isFunction(serial.open);
    assert.isFunction(serial.list);
    assert.isFunction(serial.write);
    assert.isFunction(serial.read);
    assert.isFunction(serial.readChar);
    assert.isFunction(serial.readBytes);
    assert.isFunction(serial.readBytesUntil);
    assert.isFunction(serial.readString);
    assert.isFunction(serial.readStringUntil);
    assert.isFunction(serial.available);
    assert.isFunction(serial.last);
    assert.isFunction(serial.lastChar);
    assert.isFunction(serial.clear);
    assert.isFunction(serial.stop);
    assert.isFunction(serial.close);
  });

});