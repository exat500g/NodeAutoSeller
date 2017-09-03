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
    data = data.toString();
    if(data){
        data=data.replace("\n","");
        data=data.replace("\r","");
    }
    console.log("rx:"+data);
    if(!data){
        serialPort.send("\r\n");
        return;
    }
    data.trim();
    serialPort.send(data+"\r\n");
    if(data.match(patternState)){
        serialPort.send("DATA:"+state + "\r\n");
    }else if(data.match(patternProcess)){
        if(state != STATE.IDLE){
            serialPort.send("ERR:busy\r\n");
            return;
        }
        var result=data.match(patternProcess);
        if(isFinite(result[1]) && isFinite(result[2])){
            var ch=Number(result[1]);
            var sec=Number(result[2]);
            if(ch >=0 && ch <40 && sec>=0 && sec<=120){
                state = STATE.PROCESS;
                serialPort.send("QUEUED:"+state + "\r\n");
                setTimeout(function(){
                    state = STATE.IDLE;
                    serialPort.send("COMPLETED:process complete\r\n");
                    console.log("SIMULATOR:process completed");
                },3 + 1000*sec);
                console.log("SIMULATOR:processing "+ch+","+sec);
                return;
            }
        }
        serialPort.send("ERR:invalid param\r\n");  
    }else if(data.match(patternCode)){
        var result=data.match(patternCode);
        if(isFinite(result[1])){
            var id=Number(result[1]);
            if(id>=0 && id<40){
                serialPort.send("DATA:"+code[id] + "\r\n");
                return;
            }
        }
        serialPort.send("DATA:invalid id\r\n");  
    }else if(data.match(patternStatus)){
        //DOOR为冰箱门状态,1为打开,0为关闭
        //TEMP为温度,整数(-127~127)
        serialPort.send("DATA:DOOR0,TEMP23\r\n\r\n");  
    }else if(data.match(/sn()/)){
        serialPort.send("DATA:002300193236470937313339\r\n");  
    }else{
        serialPort.send("DATA:unknow command\r\n");
    }
}

const serialPort = new Linklayer("COM2",onOpened);

