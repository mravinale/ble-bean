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
var detectionFlag = false;
var lastx = null;
var lasty = null;
var lastz = null;
var offset = 0.06;

var stopInterval = function () {
    clearInterval(intervalId);
    connectedBean.setColor(new Buffer([0x0,0x0,0x0]), function(){});
}

var startInterval = function () {
    intervalId = setInterval(readData,1000);
}

var readData = function() {

if(detectionFlag) return; 

      connectedBean.requestAccell(
      function(){
        console.log("request accell sent");
      });
/*
      bean.requestTemp(
      function(){
        console.log("request temp sent");
      });
*/
    
};

Bean.discover(function(bean){
  connectedBean = bean;
  process.on('SIGINT', exitHandler.bind(this));

  connectedBean.on("accell", function(x, y, z, valid){
    var status = valid ? "valid" : "invalid";
    
    if(detectionFlag) return; 
  	
    if(!lastx){ lastx = x; lasty = y; lastz = z; return; }
   
    var diffx = Math.abs(lastx) - Math.abs(x);
    var diffy = Math.abs(lasty) - Math.abs(y);
    var diffz = Math.abs(lastz) - Math.abs(z);

    if( Math.abs(diffx) > offset || Math.abs(diffy) > offset || Math.abs(diffz) > offset) {
      detectionFlag = true;
      bean.setColor(new Buffer([255,0,0]), function(){
          console.log("received " + status + " accell\tx:\t" + x + "\ty:\t" + y + "\tz:\t" + z );
      });

      client.publish('/device/switch/key/1qaz2wsx', "{\"value\":\"1\",\"tag\":\"movement\"}");
      stopInterval();
            
      setTimeout(function(){
        startInterval();
        client.publish('/device/switch/key/1qaz2wsx', "{\"value\":\"0\",\"tag\":\"movement\"}"); 
        detectionFlag = false;      
      },5000); 
            
    }

    lastx = x; 
    lasty = y; 
    lastz = z; 
   
  });

  connectedBean.on("temp", function(temp, valid){
    var status = valid ? "valid" : "invalid";
    console.log("received " + status + " temp:\t" + temp);
  });

  connectedBean.on("disconnect", function(){
    process.exit();
  });

  connectedBean.connectAndSetup(function(){
    startInterval();
  });
    

});



process.stdin.resume();//so the program will not close instantly
var triedToExit = false;

//turns off led before disconnecting
var exitHandler = function exitHandler() {

  var self = this;
  client.end();
  if (connectedBean && !triedToExit) {
    triedToExit = true;
    stopInterval();
  
    //no way to know if succesful but often behind other commands going out, so just wait 2 seconds
    console.log('Disconnecting from Device...');
    setTimeout(connectedBean.disconnect.bind(connectedBean, function(){}), 2000);
  } else {
    
    process.exit();
  }
};