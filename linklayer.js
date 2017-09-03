/*
linklayer protocol for serialport
HEAD1 HEAD2 LENGTH GUARD DATA[] CHECKSUM  TAIL
0xAA  0xAB  1~0xFF 0x00   u8[]  sum(DATA) 0x00
*/

var SerialPort = require("serialport");

Linklayer = function(comName,onOpened){
    const HEAD1=0xAA;
    const HEAD2=0xAB;
    const GUARD=0x00;
    const TAIL=0x00;
    const STATE_HEAD1=0;
    const STATE_HEAD2=1;
    const STATE_LEN=2;
    const STATE_GUARD=3;
    const STATE_DATA=4;
    const STATE_CHK=5;
    const STATE_TAIL=6;
    
    var serialPort = new SerialPort(comName,{baudrate: 115200},onOpened);
    
    this.setOnFrameReady = function(callback){
        serialPort.on('data', function(rxStream) {
            var rxData=null;
            for(var b of rxStream){
                rxData=inputByte(b);
                if(rxData && callback){
                    callback(rxData);
                }
            }
        });
    }
    
    this.close = function(callback){
        serialPort.close(callback);
    }
    
    this.send = function(buffer,onErr){
        if(typeof(buffer)=="string"){
            buffer=Buffer.from(buffer);
        }else if(typeof(buffer)!="object" || buffer.constructor != Buffer){
            console.log("Linklayer.send: invalid buffer");
            return;
        }
        if(buffer.length>240){
            onErr("frame too large");
            return;
        }
        var detectFrameGuard = new FrameDetector();
        var frame = Buffer.allocUnsafe(255);
        frame[0]=HEAD1;
        frame[1]=HEAD2;
        frame[2]=buffer.length;
        frame[3]=GUARD;
        var counter=4;
        for(var i=0;i<buffer.length;i++,counter++){
            frame[counter]=buffer[i];
            if(detectFrameGuard(buffer[i])==STATE_HEAD2){
                counter++;
                frame[counter]=GUARD;
            }
        }
        frame[counter++]=calcChecksum(buffer);
        frame[counter++]=GUARD;
        frame=frame.slice(0,counter);
        //console.log('linklayer.send:'+frame.toString('hex'));
        serialPort.write(frame,onErr);
    };

    var FrameDetector = function(){
        var state=STATE_HEAD1;
        return function(b){
            switch(state){
            case STATE_HEAD1:
                if(b==HEAD1){
                    state++;
                }
                break;
            case STATE_HEAD2:
                if(b==HEAD2){
                    state++;
                    return STATE_HEAD2;
                }else if(b!=HEAD1){
                    state=STATE_HEAD1;
                }
                break;
            case STATE_LEN:
                if(b==HEAD1){
                    state=STATE_HEAD2;
                }else{
                    state=STATE_HEAD1;
                }
                if(b==0){
                    return STATE_GUARD;
                }else{
                    return STATE_LEN;
                }
                break;
            default:
                throw("shouldn't be here");
                break;
            }
            return false;
        }
    };

    var inputByte = function(){
        var rxData=0;
        var rxChecksum=0;
        var rxCounter=0;
        var rxLength=0;
        var rxState=STATE_HEAD1;
        var detectFrameHead = new FrameDetector();
        return function(b){
            //console.log('linklayer.input:'+b.toString(16));
            var headState=detectFrameHead(b);
            if(headState==STATE_LEN){
                rxState=STATE_LEN;
            }
            switch(rxState){
            case STATE_LEN:
                rxCounter=0;
                rxLength=b;
                rxData=Buffer.allocUnsafe(rxLength);
                rxState++;
                break;
            case STATE_GUARD:
                if(b==GUARD){
                    rxState++;
                }else{
                    rxState=STATE_HEAD1;
                }
                break;
            case STATE_DATA:
                if(rxCounter < rxLength && headState!=STATE_GUARD){
                    rxData[rxCounter]=b;
                    rxCounter++;
                    if(rxCounter==rxLength){
                        rxState++;
                    }
                }
                break;
            case STATE_CHK:
                if(headState==STATE_GUARD){
                    break;
                }
                if(calcChecksum(rxData)==b){
                    rxState++;
                }else{
                    rxState=STATE_HEAD1;
                }
                break;
            case STATE_TAIL:
                if(b==GUARD){
                    return rxData;
                }
                rxState=STATE_HEAD1;
                break;
            default:
                break;
            }
            return null;
        }
    }();
    var calcChecksum = function(buffer){
        var checksum=0xAA;
        for(var i=0;i<buffer.length;i++){
            checksum += buffer[i];
        }
        checksum %= 0x100;
        return checksum;
    }
    return this;
}


test = function(){
    var linklayer=new Linklayer("COM5",function onOpened(err){
        if(err){
            console.log(err);
            return;
        }
        linklayer.onFrameReceived(function(data){
            console.log('data received:'+data.readUInt32LE(0));
        });
        var data=Buffer.from("0000");
        var counter=0;
        setInterval(function(){
            data.writeUInt32LE(counter++,0);
            linklayer.send(data);
        },100);
    });
    var send = function(){
        var txData=Buffer.from("hello serialport");
        var txFrame=linklayer.send(txData);
    }
}
//test();

module.exports = Linklayer;
