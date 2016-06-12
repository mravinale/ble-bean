
"use strict";

var Bean = require('ble-bean');

var mqtt = require('mqtt');

var client = mqtt.connect({ 
  port: 1883, 
  host: 'app.connectingthings.io', 
  keepalive: 10000, 
  protocolId: 'MQIsdp', 
  protocolVersion: 3
});

var intervalId;
var connectedBean;
var lastx = null;
var lasty = null;
var lastz = null;
var offset = 0.09;

Bean.discover(function(bean){
  connectedBean = bean;
  process.on('SIGINT', exitHandler.bind(this));

  bean.on("accell", function(x, y, z, valid){
    var status = valid ? "valid" : "invalid";
  	
    if(!lastx){ lastx = x; lasty = y; lastz = z; return; }
   
    var diffx = Math.abs(lastx) - Math.abs(x);
    var diffy = Math.abs(lasty) - Math.abs(y);
    var diffz = Math.abs(lastz) - Math.abs(z);

    if( Math.abs(diffx) > offset || Math.abs(diffy) > offset || Math.abs(diffz) > offset) {
      console.log("received " + status + " accell\tx:\t" + x + "\ty:\t" + y + "\tz:\t" + z );
      client.publish('/device/switch/key/1qaz2wsx', "{\"value\":\"1\",\"tag\":\"movement\"}");
      client.publish('/device/switch/key/1qaz2wsx', "{\"value\":\"0\",\"tag\":\"movement\"}");
    }

    lastx = x; 
    lasty = y; 
    lastz = z; 
   
  });

  bean.on("temp", function(temp, valid){
    var status = valid ? "valid" : "invalid";
    console.log("received " + status + " temp:\t" + temp);
  });

  bean.on("disconnect", function(){
    process.exit();
  });

  bean.connectAndSetup(function(){

    var readData = function() {

      //set random led colors between 0-255. I find red overpowering so red between 0-64
/*   bean.setColor(new Buffer([getRandomInt(0,64),getRandomInt(0,255),getRandomInt(0,255)]),
        function(){
          console.log("led color sent");
      });
*/
      bean.requestAccell(
      function(){
        console.log("request accell sent");
      });
/*
      bean.requestTemp(
      function(){
        console.log("request temp sent");
      });
*/
    }

    intervalId = setInterval(readData,1000);
  });

});

var getRandomInt = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

process.stdin.resume();//so the program will not close instantly
var triedToExit = false;

//turns off led before disconnecting
var exitHandler = function exitHandler() {

  var self = this;
  client.end();
  if (connectedBean && !triedToExit) {
    triedToExit = true;
    console.log('Turning off led...');
    clearInterval(intervalId);
    connectedBean.setColor(new Buffer([0x0,0x0,0x0]), function(){});
    //no way to know if succesful but often behind other commands going out, so just wait 2 seconds
    console.log('Disconnecting from Device...');
    setTimeout(connectedBean.disconnect.bind(connectedBean, function(){}), 2000);
  } else {
    
    process.exit();
  }
};