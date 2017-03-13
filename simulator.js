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

const STATE = function(){
    this.IDLE="idle";
    this.HOME="home";
    this.PROCESS="process";
    this.SCAN="scan";
    return this;
}();

var code=new Array(40);

var state = STATE.HOME;
setTimeout(function(){
    state=STATE.SCAN;
    setTimeout(function(){
        for(var i=0;i<40;i++){
            code[i]="20170101"+i;
        }
        state=STATE.IDLE;
    },5000);
},5000);

const patternState = /state()/
const patternProcess = /process\((-?\d+),(-?\d+)\)/
const patternCode = /code\((-?\d+)\)/
const patternStatus = /status()/

const onData = function(data) {
    if(data){
        data=data.replace("\n","");
        data=data.replace("\r","");
    }
    console.log("rx:"+data);
    if(!data){
        serialPort.write("\r\n");
        return;
    }
    data.trim();
    serialPort.write(data+"\r\n");
    if(data.match(patternState)){
        serialPort.write("DATA:"+state + "\r\n");
    }else if(data.match(patternProcess)){
        if(state != STATE.IDLE){
            serialPort.write("ERR:busy\r\n");
            return;
        }
        var result=data.match(patternProcess);
        if(isFinite(result[1]) && isFinite(result[2])){
            var ch=Number(result[1]);
            var sec=Number(result[2]);
            if(ch >=0 && ch <40 && sec>=0 && sec<=120){
                state = STATE.PROCESS;
                serialPort.write("QUEUED:"+state + "\r\n");
                setTimeout(function(){
                    state = STATE.IDLE;
                    serialPort.write("OK:process complete\r\n");
                },3 + 1000*sec);
                return;
            }
        }
        serialPort.write("ERR:invalid param\r\n");  
    }else if(data.match(patternCode)){
        var result=data.match(patternCode);
        if(isFinite(result[1])){
            var id=Number(result[1]);
            if(id>=0 && id<40){
                serialPort.write("DATA:"+code[id] + "\r\n");
                return;
            }
        }
        serialPort.write("DATA:invalid id\r\n");  
    }else if(data.match(patternStatus)){
        //DOOR为冰箱门状态,1为打开,0为关闭
        //TEMP为温度,整数(-127~127)
        serialPort.write("DATA:DOOR0,TEMP23\r\n\r\n");  
    }else{
        serialPort.write("DATA:unknow command\r\n");
    }
}

const serialPort = new SerialPort("COM2",{baudrate: 115200, parser:SerialPort.parsers.readline('\r')},onOpened);

