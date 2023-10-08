class Decoder{
    static codec = "vp8";
    static width = 1920;
    static height = 1080
    static  config = {
        codec: this.codec,
        width: this.width,
        height: this.height,
        bitrate: 8_000_000, // 8 Mbps
        framerate: 30,
    };
    static  decoderMap = new Map();
    static userId = "";
    static createDecodeInit =(uid)=>{
        return {
            output: (frame) => {
                self.postMessage({userId: uid, frame: frame}, [frame]);
            },
            error: (e) => {
                console.log("VideoDecoder-ERROR", e)
                // self.postMessage({ severity: 'fatal', text: `Init Decoder error: ${e.message}` });
            }
        };
    };

    static async encoder(data){
        /**
         * 解出timestamp
         * **/
        //取出补位数
        const coveringNum = new Uint8Array(data.buffer.slice(0,1))[0];
         //取出十位 timestamp
        const timestampNum = new Uint8Array(data.buffer.slice(1,11));
        const diff = 10 - coveringNum;
        let realityTimestampNum = "";
        for (let i = 0; i < diff; i++) {
            realityTimestampNum+= timestampNum[i]
        }
        const chunkData =  new Uint8Array(data.buffer.slice(11));
        const decoderSupport = await VideoDecoder.isConfigSupported(this.config);
        if (decoderSupport.supported) {
            let decoder;
            if(this.decoderMap.has(data.userId)){
                decoder = this.decoderMap.get(data.userId);
            }else{
                decoder = new VideoDecoder(this.createDecodeInit(data.userId));
                this.decoderMap.set(data.userId,decoder);
            }

            decoder.configure({
                codec: this.codec,
                codedWidth: this.width,
                codedHeight: this.height,
            });
            const chunk = new EncodedVideoChunk({
                type: "key",
                data:chunkData,
                timestamp: Number(realityTimestampNum),
                // duration: duration,
            })
            decoder.decode(chunk);
            await decoder.flush();
        } else {
            console.log('Config not supported:\n' + JSON.stringify(decoderSupport.config))
        }
    }
    static async renderMessage(res){
        if(res.data.type &&　res.data.type === "exitUser"){
            Decoder.decoderMap.delete(res.data.userId);
            return;
        }
       await Decoder.encoder(res.data)
    }
}

async function decode(videoBuffer, timestamp, type, duration) {


}

self.addEventListener("message",Decoder.renderMessage )