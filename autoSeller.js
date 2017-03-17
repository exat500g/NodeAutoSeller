/*
api interface for autoSeller

AutoSeller成员接口

callback回调接口格式:
callback(bool succ,string message)

callback的succ表示成功,否则失败. 失败包括通信失败和执行失败
message有状态信息或错误信息

1.state(callback)
返回运动状态(字符串格式,不包括引号)
状态有
"idle" : 空闲状态,可以发送process指令,code指令
"home" : 归位中,不接收新process指令
"process" : 处理货物中,不接收新的process指令
"scan" : 扫描货道中,不接收新的process指令,此时调用code指令可能获得错误的二维码
如果控制上电的时候门是打开的,控制会等到门关闭后再进行扫描,此时状态为"scan"

2.process(channel,second,callback)
处理货物,包括取餐和加热和出餐
channel : 货道号0~39
second : 加热时间(1~120)
callback的succ表示处理成功,否则失败.message有错误信息

3.code(channel,callback)
读取储存的二维码
channel : 货道号0~39
二维码从callback的message获得
如果没有扫描到二维码,会返回空字符串
!!其实code可以一次返回所有的条形码,你可以再simulator.js里自己定义一个格式,我看能不能实现

4.status(callback) 
未完成
获取温度,开门等信息

5.sn(callback)
获取芯片SN

*/

const SerialPort = require("serialport");
const assert = require('assert');

AutoSeller = function(comName){
    const CONN_TIMEOUT=1000;
    var queryCallback={
        enable:false,
        call:null,
    };
    var cmdCallback={
        enable:false,
        call:null,
    };
    var debugLog = 0;
    this.setDebugLog = function(d){
        debugLog=d;
    }
    
    const generateCallWithCallback = function(externCallback){
        const func=function(data,userCallback){
            if(externCallback.call){
                externCallback.call(false,"不能连续通信");
                return;
            }
            externCallback.call=userCallback;
            externCallback.enable=true;
            serialPort.write(data);
            setTimeout(function(){
                if(externCallback.enable && externCallback.call){
                    var call=externCallback.call;
                    externCallback.enable=false;
                    externCallback.call=null;
                    call(false,"timeout");
                }
            },CONN_TIMEOUT);
        }
        return func;
    }
    const internalQuery = generateCallWithCallback(queryCallback);
    const internalCmd   = generateCallWithCallback(cmdCallback);
    
    const callQueryCb = function(result,message){
        if(queryCallback && queryCallback.call){
            var call=queryCallback.call;
            queryCallback.enable=false;
            queryCallback.call=null;
            call(result,message);
        }
    }
    const callCmdCb = function(result,message){
        if(cmdCallback && cmdCallback.call){
            var call=cmdCallback.call;
            cmdCallback.enable=false;
            cmdCallback.call=null;
            call(result,message);
        }
    }
    
    const onData = function(data){
        if(data){
            data=data.replace("\n","");
            data=data.replace("\r","");
        }
        if(debugLog){
            console.log("DataReceived: "+data);
        }
        /*
        为了不让state干扰process,将指令分为CMD类型和DATA类型,使用不同的callback
        DATA类型指令统一使用"DATA:"前缀返回 , 仅仅超时会返回ERR
        CMD指令会返回"QUEUED"表示指令以提交,"OK"表示指令成功完成,"ERR"表示失败
        */
        const patternData = /^DATA:(.*)/
        const patternCompleted = /^COMPLETED:(.*)/
        const patternQueued = /^QUEUED:(.*)/
        const patternErr = /^ERR:(.*)/
        const patternResult = /.*:(.*)/
        var result=data.match(patternResult);
        if( data.match(patternData)) {
            callQueryCb(true,result[1]);
        }else if(data.match(patternCompleted)){
            callCmdCb(true,result[1]);
        }else if(data.match(patternQueued)){
            if(cmdCallback){
                cmdCallback.enable=false;
            }
        }else if(data.match(patternErr)){
            callCmdCb(false,result[1]);
        }
    }
    
    this.getState = function(callback){
        assert(callback)
        internalQuery("state()\r\n",callback);
    }
    this.process = function(channel,second,callback){
        assert(callback)
        internalCmd("process("+channel+","+second+")\r\n",callback);
    }
    this.getCode = function(channel,callback){
        assert(callback)
        internalQuery("code("+channel+")\r\n",callback);
    }
    this.getStatus = function(callback){
        assert(callback)
        internalQuery("status()\r\n",callback);
    }
    this.getSN = function(callback){
        assert(callback)
        internalQuery("sn()\r\n",callback);
    }
    this.open = function(callback){
        assert(callback)
        serialPort.open(function(err){
            if(err){
                callback(false,err);
                return;
            }
            serialPort.on('data', onData);
            serialPort.write("\r\n");
            callback(true,"");
        });
    }
    this.close = function(callback){
        serialPort.close(callback);
    }
    this.debugWrite = function(data){
        debugLog=1;
        serialPort.write(data+"\r\n");
    }
    
    var serialPort = new SerialPort(comName,{autoOpen:false,baudrate: 115200, parser:SerialPort.parsers.readline('\r')});
    
    return this;
}

module.exports = AutoSeller;

