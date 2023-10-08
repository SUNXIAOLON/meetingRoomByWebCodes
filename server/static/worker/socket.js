const typeOpenKey ="open";
const typeCloseKey = "close";
const typePaddingKey = "padding";
const typeServerCloseKey = "serverClose";
let meetingId = "";
let userName = "";
let type = "";
let userKeyBuffer;
const encoder = new TextEncoder();
const dncoder = new TextDecoder();
const strValuable =(str,key)=>{
    if(typeof str != "string") {
      return false;
    }
    return str.indexOf(key) >= 0;
}
class socket{
    static  isOpen= typeCloseKey;
    static ws;
    static closeTime = 0;
    static open(){
       this.isOpen = typeOpenKey;
        console.log("Connection open escalation...");
    };
    static message(evt){
        const data = evt.data;
        if(data === "会议室不存在"){
            this.isOpen = typeServerCloseKey;
            return;
        }
        //退出人员
        if(strValuable(data,"exitUser")){
            const exitUser = JSON.parse(data)
            self.postMessage(exitUser)
            return;
        }
        //参会人员信息
        if(strValuable(data,"participants")){
            const participants = JSON.parse(data)
            self.postMessage(participants)
            return;
        }
        // console.log(data)
        const u8 = new Uint8Array(data);
        const userId =  u8.slice(0,32);
        // console.log(dncoder.decode(userName))
        const mediaData = u8.slice(32).buffer;
        const text = dncoder.decode(mediaData.slice(0,4));
        let msgType;
        if(text === "RIFF"){
            msgType = "audio"
        }else{
            msgType = "video"
        }
        self.postMessage({type:"mediaBuffer",dataType:msgType,value:mediaData,userId:dncoder.decode(userId)},[mediaData])
    };
    static close(evt){
        this.closeTime = new Date().getTime();
        this.isOpen = typeCloseKey;
        console.log("Connection closed." + evt);
    }
    static  error(evt){
        this.isOpen = typeCloseKey;
        console.log("ws---error",evt.data)
    }
    static start(){
        this.isOpen = typePaddingKey;
        this.ws = new WebSocket(`ws://192.168.3.30:8082/meetingJoin?meetingId=${meetingId}&name=${userName}`)
        this.ws.binaryType='arraybuffer'
        this.ws.onopen = this.open.bind(socket);
        this.ws.onclose = this.close.bind(socket);
        this.ws.onmessage = this.message.bind(socket);
        this.ws.onerror = this.error.bind(socket)
    }
}
self.addEventListener('message', function (e) {
    if(e.data.type === "join"){
        meetingId = e.data.meetingId;
        userKeyBuffer = encoder.encode(e.data.md5UserName);
        userName = e.data.userName;
        type = e.data.type;
        return;
    }
    if(socket.isOpen === typeOpenKey){
        // console.log("sendsned",e.data.buffer)
        const mediaU8 = new Uint8Array(e.data.buffer);
        const u8 = new Uint8Array(userKeyBuffer.byteLength + mediaU8.byteLength);
        u8.set(userKeyBuffer,0);
        u8.set(mediaU8,userKeyBuffer.byteLength)
        socket.ws.send(u8.buffer)
        return;
    }
    if(socket.isOpen === typeCloseKey){
        if((new Date().getTime() - socket.closeTime)/1000 > 10){
            socket.start();
        }

    }



    // console.log(e.data.buffer)
    // this.self.postMessage({chunk:e.data.buffer},[e.data.buffer])
});
