class VideoEncode{
    static encoder;
    static reader;
    static config = {
        codec: 'vp8',
        width: 1920,
        height: 1080,
        bitrate: 9_000_000, // 8 Mbps
        framerate: 30,
    };
    static videoEncoderInit = {
        output: (chunk, metadata) => {
            if (metadata.decoderConfig) {
                // console.log("配置", metadata.decoderConfig)

            }
            // console.log(chunk.type)
            //将 chunk.timestamp, chunk.type, 转 arraybuffer 和 数据一起传递
            let strTimestamp = chunk.timestamp +　"";
            let diff = 10 - strTimestamp.length;
            //补零补到10位数
            for (let i = 0; i < diff; i++) {
                strTimestamp+= "0"
            }
            //第一位数为补零的个数
            strTimestamp = diff + "" + strTimestamp;
            let timestampBuffer =new Uint8Array(strTimestamp.split(""));

            const chunkData = new Uint8Array(chunk.byteLength);
            chunk.copyTo(chunkData);
            //合并
            const mergeBuffer = new Uint8Array(timestampBuffer.length +chunkData.length);
            mergeBuffer.set(timestampBuffer,0);
            mergeBuffer.set(chunkData,timestampBuffer.byteLength);
            const buffer = mergeBuffer.buffer;
            self.postMessage(buffer, [buffer]);
        },
        error: (e) => {
            console.log(e.message);
        },
    };
    static start(stream){
        this.encoder = new VideoEncoder(this.videoEncoderInit);
        this.encoder.configure(this.config);
        this.reader = stream.getReader();
        this.reader.read().then(this.encode);

    }
    static async encode({ done, value }){
        if (done) {
           try {
               await VideoEncode.encoder.flush();
               VideoEncode.encoder.close();
           }catch (e){
               console.log(e)
           }
            self.postMessage({type:"noStream"} );
            return;
        };
        const frame = value;
        if (VideoEncode.encoder.encodeQueueSize < 5) {
            VideoEncode.encoder.encode(frame, {keyFrame: true });
            VideoEncode.reader.read().then(VideoEncode.encode);
            frame.close()
        } else {
            console.log("dropping a frame");
        }
        await VideoEncode.encoder.flush();
    }
}

self.addEventListener('message', async function (e) {
    let stream = e.data.stream;
    if (!stream) return;
    VideoEncode.start(stream);


});



