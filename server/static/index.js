//操作列表
class ParticopantMenuOperate {
    static mainUserId = "";
    static  mainIsMute = false;
    static  mainIsCloseVideo = false;
    static muteKeys = new Map();
    static allMute = false;
    static closeVideoKeys = new Map();
    static allCloseVideo = false;
    static setMainIsMute(){
            this.mainIsMute = true
    }
    static delMainIsMute(){
        this.mainIsMute = false
    }
    static setMainCloseVideo(){
        this.mainIsCloseVideo = true
    }
    static delMainCloseVideo(){
        this.mainIsCloseVideo = false
    }
    static setMaimUserId(userId){
        console.log(userId)
        this.mainUserId = userId;
    }
    //被放大的参与者userId集合
    static amplifyMap = new Map();
    static isHasMute(id){
        return this.muteKeys.has(id)
    }
    static  delMute(id){
        return this.muteKeys.delete(id)
    }
    static  setMute(id){
        if(this.getAmplifyMap(id)) return false;
        return this.muteKeys.set(id,"")
    }
    static delAllMute(){
        this.allMute = false;
    }
    static setAllMute(){
        this.allMute = true;
    }
    static  getAllMute(){
        return this.allMute;
    }
    static isHasCloseVideoKeys(id){
        return this.closeVideoKeys.has(id);
    }
    static delCloseVideoKeys(id){
        return this.closeVideoKeys.delete(id)
    }
    static setCloseVideoKeys(id){
        if(this.getAmplifyMap(id)) return false
        return this.closeVideoKeys.set(id,"")
    }
    static delAllCloseVideo(){
        this.allCloseVideo = false;
    }
    static  setAllCloseVideo(){
        this.allCloseVideo = true
    }
    static getAllCloseVideo(){
        return this.allCloseVideo;
    }
    static setAmplifyMap(id){
        this.amplifyMap.set(id,"amplify-canvas")
    }
    static delAmplifyMap(id){
        this.amplifyMap.delete(id)
    }
    static  getAmplifyMap(id){
        return this.amplifyMap.get(id);
    }

}
class  CreateMeadiaStream{
    static textDecoder = new TextDecoder('utf-8');
    static stream;
    static sendWorker = new Worker('/static/worker/socket.js');
    static init = function (){
        CreateMeadiaStream.sendWorker.addEventListener("message",CreateMeadiaStream.workerMessage)
        return null;
    }()
    static async create(userName,md5UserName,meetingId){
        ParticopantMenuOperate.setMaimUserId(md5UserName);
        this.sendWorker.postMessage({type:"join",userName,md5UserName,meetingId});
        await this.mediaInit();
    }
    static setVideoStream(){
       return document.getElementById("video")
    }
    static setVideoStreamForVideo(){
        this.setVideoStream().srcObject  =  this.stream;
        const videoStream = this.stream.clone();
        StartVideo.start(videoStream);

    }
    static async mediaInit(){
        try{
            this.stream = await  navigator.mediaDevices.getUserMedia( {
                audio: true,
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            (await StartAudio.init(this.stream)).start();
            this.setVideoStreamForVideo()

        }catch (e) {
            const msg = e.message;
            switch (msg) {
                case "Requested device not found":
                    alert("未发现输入设备")
                    return;
                case "Permission denied":
                    alert("请允许使用音视频")
                    return;
                default:
                    alert("未知错误" +msg)
            }
            return;
        }
    }
    static  workerMessage(e){
        //视频流处理
        if(e.data.type === "mediaBuffer"){
            const userId = e.data.userId;
            //todo 显示对应的参会人员的说话特效
            if(e.data.dataType === "audio"){
                if(ParticopantMenuOperate.isHasMute(userId) ||　ParticopantMenuOperate.getAllMute()) return;
                StartAudio.context.decodeAudioData(e.data.value).then((decodedData) => {
                    const source = StartAudio.context.createBufferSource();
                    source.buffer = decodedData;
                    source.connect(StartAudio.context.destination);
                    // source.gain.value = 1;
                    source.start();
                });
            }
            if(e.data.dataType === "video"){
                if(ParticopantMenuOperate.isHasCloseVideoKeys(userId) ||　ParticopantMenuOperate.getAllCloseVideo()){
                    //设置关闭的视频背景
                    VideoDecoder.setBGcloseVideo(userId)
                    return;
                }
                VideoDecoder.setBuffer(e.data.value,userId);
            }

        }
        //参会人员
        if(e.data.type === "participants"){
            console.log("参会人员",e.data)
            Participants.render(e.data.list)
        }
        //退出人员
        if(e.data.type === "exitUser"){
           const delDOM =  document.getElementById(e.data.message)
            if(delDOM){
                delDOM.parentNode.remove();
                VideoDecoder.decodeVideo.postMessage({type:e.data.type, userId:e.data.message},)
            }
        }

    }
}
class StartAudio{
    static context;
    static config = {};
    static audioInput;
    static recorder;
    static audioData = {
        size: 0          //录音文件长度
        , buffer: []     //录音缓存
        , inputSampleRate: null    //输入采样率
        , inputSampleBits: 16       //输入采样数位 8, 16
        , outputSampleRate:  null   //输出采样率
        , oututSampleBits:  null      //输出采样数位 8, 16
        , input: function (data) {
            this.buffer.push(new Float32Array(data));
            this.size += data.length;
        }
        , compress: function () { //合并压缩
            //合并
            var data = new Float32Array(this.size);
            var offset = 0;
            for (var i = 0; i < this.buffer.length; i++) {
                data.set(this.buffer[i], offset);
                offset += this.buffer[i].length;
            }
            //压缩
            var compression = parseInt(this.inputSampleRate / this.outputSampleRate);
            var length = data.length / compression;
            var result = new Float32Array(length);
            var index = 0, j = 0;
            while (index < length) {
                result[index] = data[j];
                j += compression;
                index++;
            }
            return result;
        }
        , encodeWAV: function () {
            const sampleRate = Math.min(this.inputSampleRate, this.outputSampleRate);
            const sampleBits = Math.min(this.inputSampleBits, this.oututSampleBits);
            const bytes = this.compress();
            const dataLength = bytes.length * (sampleBits / 8);
            const buffer = new ArrayBuffer(44 + dataLength);
            const data = new DataView(buffer);
            const channelCount = 1;//单声道
            let offset = 0;
            const writeString = function (str) {
                for (var i = 0; i < str.length; i++) {
                    data.setUint8(offset + i, str.charCodeAt(i));
                }
            };
            // 资源交换文件标识符
            writeString('RIFF');
            offset += 4;
            // 下个地址开始到文件尾总字节数,即文件大小-8
            data.setUint32(offset, 36 + dataLength, true);
            offset += 4;
            // WAV文件标志
            writeString('WAVE');
            offset += 4;
            // 波形格式标志
            writeString('fmt ');
            offset += 4;
            // 过滤字节,一般为 0x10 = 16
            data.setUint32(offset, 16, true);
            offset += 4;
            // 格式类别 (PCM形式采样数据)
            data.setUint16(offset, 1, true);
            offset += 2;
            // 通道数
            data.setUint16(offset, channelCount, true);
            offset += 2;
            // 采样率,每秒样本数,表示每个通道的播放速度
            data.setUint32(offset, sampleRate, true);
            offset += 4;
            // 波形数据传输率 (每秒平均字节数) 单声道×每秒数据位数×每样本数据位/8
            data.setUint32(offset, channelCount * sampleRate * (sampleBits / 8), true);
            offset += 4;
            // 快数据调整数 采样一次占用字节数 单声道×每样本的数据位数/8
            data.setUint16(offset, channelCount * (sampleBits / 8), true);
            offset += 2;
            // 每样本数据位数
            data.setUint16(offset, sampleBits, true);
            offset += 2;
            // 数据标识符
            writeString('data');
            offset += 4;
            // 采样数据总数,即数据总大小-44
            data.setUint32(offset, dataLength, true);
            offset += 4;
            // 写入采样数据
            if (sampleBits === 8) {
                for (var i = 0; i < bytes.length; i++, offset++) {
                    var s = Math.max(-1, Math.min(1, bytes[i]));
                    var val = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    val = parseInt(255 / (65535 / (val + 32768)));
                    data.setInt8(offset, val, true);
                }
            } else {
                for (var i = 0; i < bytes.length; i++, offset += 2) {
                    var s = Math.max(-1, Math.min(1, bytes[i]));
                    data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                }
            }
            this.buffer = [];
            this.size = 0;
            return data.buffer;
        }
    };
    static async init(stream){
        this.context =  new window.AudioContext();
        this.audioData.inputSampleRate = this.context.sampleRate;
        this.audioData.oututSampleBits =   this.config.sampleBits =  8;      //采样数位 8, 16
        this.audioData.outputSampleRate =  this.config.sampleRate =  (44100 / 6);   //采样率(1/6 44100)
        this.audioInput = this.context.createMediaStreamSource(stream);
        this.recorder = this.context.createScriptProcessor(4096, 1, 1);
        let time = new Date().getTime()
        //音频采集
        this.recorder.onaudioprocess = function (e) {
            StartAudio.audioData.input(e.inputBuffer.getChannelData(0));
            if ((new Date().getTime() - time) / 1000 > 1) {
                if(ParticopantMenuOperate.mainIsMute) return;
                const buffer = StartAudio.audioData.encodeWAV();
                CreateMeadiaStream.sendWorker.postMessage({
                    buffer: buffer,
                    type:"audio",
                }, [buffer])
            }
        }.bind(this)
        return this;
    };
    static start(){
        this.audioInput.connect(this.recorder);
        this.recorder.connect(this.context.destination);
    }
}
class StartVideo{
    static isShareWindow = false;
    static encodeVideo = new Worker("/static/worker/videoEncode.js");
    static start(stream){
        const videoTracks = stream.getVideoTracks()[0];
        // let { aspectRatio, brightness, colorTemperature, contrast, deviceId, exposureCompensation, frameRate, height, width } = videoTracks.getSettings();
        const processor = new MediaStreamTrackProcessor(videoTracks);
        const videoStream = processor.readable;
        this.encodeVideo.postMessage({ stream: videoStream }, [videoStream]);
        this.encodeVideo.addEventListener("message",this.message)
    }
    static message(e){
        if(e.data instanceof ArrayBuffer){
            CreateMeadiaStream.sendWorker.postMessage({
                buffer: e.data,
                type:"video",
            }, [e.data])
        }else{
            //停止共享
            if(e.data.type === "noStream" && StartVideo.isShareWindow){
                CreateMeadiaStream.setVideoStreamForVideo();
            }else {
                alert("请检查设备状态")
            }

            // console.log(e.data)
        }

    }
}
class VideoDecoder{
    static decodeVideo = new Worker("/static/worker/videoDecoder.js");
    static setBuffer(buffer,userId){
        VideoDecoder.decodeVideo.postMessage({userId,buffer},[buffer])
    }
    static addEvent(){
        VideoDecoder.decodeVideo.addEventListener("message",VideoDecoder.decodeWorkerMsg)
    }
    static renderCanvas(id,data){
        const amplifyId =  ParticopantMenuOperate.getAmplifyMap(id);
        let canvas  = document.getElementById(amplifyId?amplifyId:id);
         if(canvas){
            const cw = canvas.width;    // 获取元素宽度
            const ch = canvas.height;
            const ctx = canvas.getContext("2d",{alpha:false});
            ctx.clearRect(0, 0, cw, ch);
            ctx.drawImage(data,0,0,cw,ch);
            canvas = null;
        }

    }
    static decodeWorkerMsg(e){
        VideoDecoder.renderCanvas(e.data.userId,e.data.frame);
        e.data.frame.close();
    }
    static setBGcloseVideo(userId){
        const image = new Image(300, 300);
        image.src = "/static/image/close_video.png"
        image.onload = function () {
            VideoDecoder.renderCanvas(userId,this);
        }
    }
    static init = this.addEvent();
    
}
/***
 * 分享窗口
 * **/
class ShareWindow {
    static async startCapture() {
        try {
            StartVideo.isShareWindow = true;
           const stream   = await navigator.mediaDevices.getDisplayMedia(
                { video: { cursor: 'always' }, audio: false },
            );
            CreateMeadiaStream.setVideoStream().srcObject = stream
            StartVideo.start(stream);
        } catch (err) {
            console.error("Error: " + err);
        }
    }
}
//参会人员渲染
class Participants {
    static render(list){
        const len = list.length;
        for (let i = 0; i < len; i++) {
            console.log(ParticopantMenuOperate.mainUserId)
            if(document.getElementById(list[i].id) || ParticopantMenuOperate.mainUserId === list[i].id) {
                continue
            }
            const div = document.createElement("div");
            div.innerHTML = `
                <span class="iconfont">${list[i].name}</span>
                <canvas id="${list[i].id}"  width="300" height="200"></canvas>
                <p class="particopant" key="${list[i].id}"></p>
                `;
            renderParticopantMemu.set(renderParticopantMemu.data.menuList,list[i].id,{
                isMute:false,//是否静音
                isCloseVideo:false,//是否关闭视频
                isAmplify:false,//是否放大
                })
            document.querySelector("#other-video").appendChild(div)
        }
    }

}


