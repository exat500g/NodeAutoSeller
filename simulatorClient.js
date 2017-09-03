/*
底层协议模拟器
必须安装虚拟串口(vspd.zip),并创建COM1<-->COM2互连的两个串口
*/

const Linklayer = require('./linklayer.js');

const onOpened = function(error){
    if(error){
        console.log("error="+error);
        return;
    }
    serialPort.setOnFrameReady(onData)
    console.log("open successful");
    setInterval(function(){
        console.log('tick');
        serialPort.send("sn()\r\n");
    },1000);
}

const onData = function(data) {
    data = data.toString();
    if(data){
        data=data.replace("\n","");
        data=data.replace("\r","");
    }
    console.log("rx:"+data);
}



const serialPort = new Linklayer("COM1",onOpened);

