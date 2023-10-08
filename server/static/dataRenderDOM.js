function  closeDialog(){
    document.querySelector("#dialog").close();
}
class DataRenderDOM {
    constructor(data) {
        this.data = data;
        this.render();
    }
    set(obj,key,val){
        Reflect.set(obj,key,val)
        Promise.resolve().then(()=>{
            this.render()
        })
    }
    render(){
        this.data.render(this.data);
    }
}

const  renderCreateOrJoinMethods = {
     createMeeting() {
        renderCreateOrJoin.set(renderCreateOrJoin.data,"templateKey",1)
    },
    async executeCreate(){
        const meetingName = document.querySelector("input[name=showMeetName]");
        const name = document.querySelector("input[name=showName]");
        // await CreateMeadiaStream.meadiaInit();
        if(!meetingName.value || !name.value){
         return alert("请输入会议标题和显示名称")
        }
        const userName = name.value;
        const res = await  fetch(`/meetingCreate?meetingName=${meetingName.value}`);
        const meetingMsg = await res.json();
        if(!meetingMsg.status){
            return alert(meetingMsg.message);
        }
        renderMainMenu.data.inviteCode = meetingMsg.meetingId;
        const md5UserName =  md5(userName);
        await CreateMeadiaStream.create(userName,md5UserName,meetingMsg.meetingId)
        closeDialog();

    },
    async executeJoin(){
        const joinName = document.querySelector("input[name=JshowName]");
        const inviteCode = document.querySelector("input[name=inviteCode]");
        if(!joinName.value || !inviteCode.value){
            return alert("请输入邀请码和显示名称")
        }
        const res = await  fetch(`/meetingCheck?inviteCode=${inviteCode.value}&name=${joinName.value}`);
        const meetingMsg = await res.json();
        if(!meetingMsg.status){
            return alert(meetingMsg.message);
        }
        renderMainMenu.data.inviteCode = meetingMsg.meetingId;
        const md5UserName =  md5(joinName.value);
        await CreateMeadiaStream.create(joinName.value,md5UserName,meetingMsg.meetingId)
        closeDialog();
    },

    joinMeeting(){
        renderCreateOrJoin.set(renderCreateOrJoin.data,"templateKey",0)
    },
    backSelect(){
        renderCreateOrJoin.set(renderCreateOrJoin.data,"templateKey",2)
    },
    joinTemplate(data){
       return `<button type=iconback style="margin-right:${data.right}" onClick="renderCreateOrJoinMethods.backSelect()"></button>
                <div>
                    <input type="input" value="" name="inviteCode" placeholder="邀请码"/>
                   <br/> <br/>
                     <input type="input"  name="JshowName" maxlength="20" placeholder="显示名称"/>
                     <br/> <br/>
                    <button onclick="renderCreateOrJoinMethods.executeJoin()" type=primary>加入</button>
                </div>`

    },
    selectTemplate(data){
       return `<button type=primary onClick="renderCreateOrJoinMethods.createMeeting()">${data.name1}</button>
               <button type=primary onClick="renderCreateOrJoinMethods.joinMeeting()">${data.name2}</button>`
    },
    createTexture(data) {
        return `<button type=iconback style="margin-right:${data.right}" onClick="renderCreateOrJoinMethods.backSelect()"></button>
                <div>
                 <input type="input"  name="showMeetName" maxlength="20" placeholder="会议名称"/>
                 <br/> <br/>
                 <input type="input"  name="showName" maxlength="20" placeholder="显示名称"/>
                 <br/> <br/>
                 <button onclick="renderCreateOrJoinMethods.executeCreate()" type=primary>创建</button>
                </div>`
    }
}
const renderCreateOrJoin = new DataRenderDOM({
    el:"#dialog-box",
    name:111,
    right:"50px",
    name1:"创建会议室",
    name2:"加入会议室",
    templateKey:2,
    render:(data)=>{
        Promise.resolve().then(()=>{
            if(Reflect.has(data,"template") && Reflect.has(data,"el")){
                document.querySelector(data.el).innerHTML =  data.template(data);
            }
        })
    },
    template:(tmData)=>`${tmData.templateKey === 0?renderCreateOrJoinMethods.joinTemplate(tmData):tmData.templateKey === 1?renderCreateOrJoinMethods.createTexture(tmData):
        renderCreateOrJoinMethods.selectTemplate(tmData)
    }`
})
const renderParticopantMemuMethods = {
    mute(k,t){
        const isOK = !t? ParticopantMenuOperate.setMute(k):ParticopantMenuOperate.delMute(k);
        if(isOK){
            renderParticopantMemu.set(Reflect.get(renderParticopantMemu.data.menuList,k),"isMute",!t)
        }
    },
    closeVideo(k,t){
       const isOK =  !t? ParticopantMenuOperate.setCloseVideoKeys(k): ParticopantMenuOperate.delCloseVideoKeys(k);
       if(isOK){
           renderParticopantMemu.set(Reflect.get(renderParticopantMemu.data.menuList,k),"isCloseVideo",!t)
       }
    },
    amplify(k,t){
        renderParticopantMemu.set(Reflect.get(renderParticopantMemu.data.menuList,k),"isAmplify",!t)
        renderParticopantMemuMethods.amplifyFun(k,t);
    },
    //放大视频填充之前canvas
    beforeFillingCanvas(id){
        const canvas  = document.getElementById(id);
        if(canvas){
            const cw = canvas.width;    // 获取元素宽度
            const ch = canvas.height;
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, cw, ch);
            const image = new Image(300, 300);
            image.src = "/static/image/left_lower_corner.png"
            image.onload = function () {
                ctx.drawImage(image,0,0,cw,ch)
            }
        }
    },
    amplifyFun(id,type){
        const box = document.getElementById("video-region");
        const displayBox = document.querySelector("#amplify-canvas")
        const video = document.querySelector("#video-region #video")
        if(!type){
            displayBox.width = box.offsetWidth;
            displayBox.height = box.offsetHeight;
            video.style.position ="fixed";
            video.style.width = "100px";
            video.style.height = "100px";
            video.style.right = "0";
            video.style.bottom = "0";
            ParticopantMenuOperate.setAmplifyMap(id);
            renderParticopantMemuMethods.beforeFillingCanvas(id);
            if (document.pictureInPictureEnabled) {
                video.requestPictureInPicture();
            }
        }else{
            video.style = "";
            const ctx = displayBox.getContext("2d");
            ctx.clearRect(0, 0, displayBox.width, displayBox.height);
            ParticopantMenuOperate.delAmplifyMap(id);
            if (document.pictureInPictureElement) {
                document.exitPictureInPicture();
            }
        }
    },
    renderTm(menuList){
        for (let key of Object.keys(menuList)) {
            const menu = Reflect.get(menuList,key);
            const htmlTm = `<span onclick="renderParticopantMemuMethods.mute('${key}',${menu.isMute})" class="iconfont ${menu.isMute?'icon-close-maikefeng color-red':'icon-maikefeng color-green'}"  title="关闭麦克风"></span>
                    <span onclick="renderParticopantMemuMethods.closeVideo('${key}',${menu.isCloseVideo})" class="iconfont  ${menu.isCloseVideo?'icon-video-off color-red':'icon-videocam color-green'}"  title="关闭视频"></span>
                    <span onclick="renderParticopantMemuMethods.amplify('${key}',${menu.isAmplify})" onclick="" class="iconfont  ${menu.isAmplify?'icon-suoxiao color-red':'icon-fangda color-green'}" title="放大"></span>`
            const queryDom =  document.querySelector(`[key='${key}']`);
            if(queryDom) queryDom.innerHTML = htmlTm;
        }
    }
}
const renderParticopantMemu = new DataRenderDOM({
    menuList:{
        // 23333455:{
        //     isMute:false,//是否静音
        //     isCloseVideo:false,//是否关闭视频
        //     isAmplify:false,//是否放大
        // },
        // 13333455:{
        //     isMute:false,//是否静音
        //     isCloseVideo:false,//是否关闭视频
        //     isAmplify:false,//是否放大
        // }
    },
    render:(data)=>{
        data.template(data)
    },
    template:(data)=>{renderParticopantMemuMethods.renderTm(data.menuList)}
})
const renderMainMenu = new DataRenderDOM({
    el:"#main-video-setting",
    isMute:false, //静音
    isCloseVideo:false, //关闭视频
    inviteCode:"",
    render:(data)=>{
        Promise.resolve().then(()=>{
            if(Reflect.has(data,"template") && Reflect.has(data,"el")){
                document.querySelector(data.el).innerHTML =  data.template(data);
            }
        })
    },
// <button onClick="renderMainMenuMethods.closeVideo('isCloseVideo',${data.isCloseVideo})"
//         title="${data.isCloseVideo?'打开视频':'关闭视频'}"
//         className="iconfont ${data.isCloseVideo?'icon-video-off color-red':'icon-videocam color-green'}"></button>
    template:(data)=>`
          <button onclick="renderMainMenuMethods.capture()">共享桌面</button>
          <button onclick="renderMainMenuMethods.mute('isMute',${data.isMute})" title="${data.isMute?'取消静音':'静音'}"  class="iconfont ${data.isMute?'icon-close-maikefeng color-red':'icon-maikefeng color-green'}"></button>
          <button onclick="renderMainMenuMethods.copyInviteCode()">邀请码</button>    
`
})
const renderMainMenuMethods = {
    capture(){
        ShareWindow.startCapture();
    },
    mute(k,t){
        !t? ParticopantMenuOperate.setMainIsMute():ParticopantMenuOperate.delMainIsMute();
        renderMainMenu.set(renderMainMenu.data,"isMute",!t)
    },
    closeVideo(k,t){
        !t? ParticopantMenuOperate.setMainCloseVideo(): ParticopantMenuOperate.delMainCloseVideo();
        renderMainMenu.set(renderMainMenu.data,"isCloseVideo",!t)
    },
    copyInviteCode(){
        navigator.clipboard.writeText(renderMainMenu.data.inviteCode).then(() => {
            alert("复制成功！")
        }).catch((err)=>{
            alert("复制失败！")
        })
    }
}
