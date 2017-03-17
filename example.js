/*
cli example for autoSeller

使用字符终端测试autoSeller行为

可以输入指令
state()
process(int channel,int second)
code(ing channel)
codes()

例如:
state()
process(10,10)
code(10)
codes()
*/

const AutoSeller = require('./autoSeller.js')
var Readline = require('readline')
var rl = Readline.createInterface(process.stdin,process.stdout)

const patternState = /state()/
const patternProcess = /process\((-?\d+),(-?\d+)\)/
const patternCode = /code\((-?\d+)\)/
const patternStatus = /status()/
const patternCodes = /codes()/

test = function(){
    const autoSeller=new AutoSeller("COM1");
    autoSeller.open(function(succ,message){
        if(!succ){
            console.log("failed:"+message);
            return;
        }
        autoSeller.debugLog=1;
        console.log("connect successful");
        rl.on('line',function(line){
            if(line.match(patternState)){
                autoSeller.getState(function(succ,message){
                    if(succ){
                        console.log("state:"+message);
                    }else{
                        console.log("failed:"+message);
                    }
                });
            }else if(line.match(patternProcess)){
                const ret=line.match(patternProcess);
                autoSeller.process(ret[1],ret[2],function(succ,message){
                    if(succ){
                        console.log("process successful");
                    }else{
                        console.log("failed:"+message);
                    }
                });
            }else if(line.match(patternCode)){
                const ret=line.match(patternCode);
                autoSeller.getCode(ret[1],function(succ,message){
                    if(succ){
                        console.log("code:"+message);
                    }else{
                        console.log("failed:"+message);
                    }
                });
            }else if(line.match(patternStatus)){
                autoSeller.getStatus(function(succ,message){
                    if(succ){
                        console.log("status:"+message);
                    }else{
                        console.log("failed:"+message);
                    }
                });
            }else if(line.match(/sn\(\)/)){
                autoSeller.getSN(function(succ,message){
                    if(succ){
                        console.log("sn:"+message);
                    }else{
                        console.log("failed:"+message);
                    }
                });
            }else if(line.match(/debug\((.*)\)/)){
                const ret=line.match(/debug\((.*)\)/);
                console.log("debug.send:"+ret[1]);
                autoSeller.debugWrite(ret[1]);
           }else if(line.match(patternCodes)){
                const CODE_NUM=40;
                var code=new Array(CODE_NUM);
                var getCodes=function(externCodeArray,userCallback){
                    var currentId=0;
                    var nextFunc = function(succ,message){
                        if(succ){
                            externCodeArray[currentId]=message;
                            currentId++;
                            if(currentId>=CODE_NUM){
                                userCallback(true);
                            }else{
                                autoSeller.getCode(currentId,nextFunc)
                            }
                        }else{
                            userCallback(false);
                        }
                    }
                    autoSeller.getCode(currentId,nextFunc);
                }
                getCodes(code,function(succ){
                    if(succ){
                        console.log("succ:"+code);
                    }else{
                        console.log("failed:");
                    }
                });
            }
        });
    });
}();
