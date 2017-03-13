首先安装vspd.zip虚拟串口,并创建COM1<-->COM2两个互连的虚拟串口
然后使用npm在本目录下安装serialport包   npm install serialport
使用node运行simulator.js以在COM2上进行仿真
然后运行example.js使用COM1进行字符交互
autoSeller.js是API交互接口
