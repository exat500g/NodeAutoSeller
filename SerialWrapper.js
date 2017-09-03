/*
底层协议模拟器
必须安装虚拟串口(vspd.zip),并创建COM1<-->COM2互连的两个串口
*/

const SerialPort = require('serialport');

const onOpened = function(error){
    if(error){
        console.log("error="+error);
        return;
    }
    serialPort.on('data', onData);
    console.log("open successful");
}

const onData = function(data) {
    if(!data)return;
    for(var i=0;i<data.length)
}

const serialPort = new SerialPort("COM2",{baudrate: 115200,parser: SerialPort.parsers.byteDelimiter([0xAA,0xAA])},onOpened);
