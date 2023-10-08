package Meeting

import (
	"crypto/md5"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/goccy/go-json"
	"github.com/gorilla/websocket"
	"log"
	"meetingServer/tool"
	"net/http"
)

func createMd5(val string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(val)))
}

var meetings = make(map[string]*meeting)
var notifyExitUser = "exitUser"

// 参与者
type participant struct {
	id   string
	name string
	ws   *websocket.Conn
}

// 会议室
type meeting struct {
	createId       string
	createName     string
	participantMap map[string]*participant
}
type byteChan struct {
	ws            *websocket.Conn
	bytes         *[]byte
	meetingId     string
	participantId string
	weiteType     int
}
type notifyUserStruct struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

var writeSocketChan = make(chan byteChan)
var writeSocketFun = writeSocket()

func writeSocket() string {
	go func() {
		for {
			v, ok := <-writeSocketChan
			if ok {
				err := v.ws.WriteMessage(v.weiteType, *v.bytes)
				if err != nil {
					fmt.Println("分配数据")
					fmt.Println(err)

					closEerr := v.ws.Close()
					if closEerr != nil {
						fmt.Println(closEerr)
						continue
					}
					if meeting, isO := meetings[v.meetingId]; isO {
						delete(meeting.participantMap, v.participantId)
					}
				}
			}
		}
	}()
	return ""
}

func (m *meeting) setMedia(own string, byte2 []byte) {
	for k, v := range m.participantMap {
		if k == own {
			continue
		}
		//fmt.Println("byte2--->", k)
		var write byteChan
		write.ws = v.ws
		write.bytes = &byte2
		write.participantId = v.id
		write.meetingId = m.createId
		write.weiteType = websocket.BinaryMessage
		writeSocketChan <- write
		//err := v.ws.WriteMessage(websocket.BinaryMessage, byte2)
		//if err != nil {
		//	fmt.Println("分配数据")
		//	fmt.Println(err)
		//	continue
		//}
	}
}
func (m *meeting) notifyOthers(own string) {
	type participantInfo struct {
		Name string `json:"name"`
		Id   string `json:"id"`
	}
	var participantList struct {
		Type string             `json:"type"`
		List []*participantInfo `json:"list"`
	}
	participantList.Type = "participants"
	for _, info := range m.participantMap {
		var PInfo participantInfo
		PInfo.Name = info.name
		PInfo.Id = info.id
		participantList.List = append(participantList.List, &PInfo)
	}
	b, jerr := json.Marshal(participantList)
	if jerr != nil {
		fmt.Println("json.Marshal会议室用户信息失败", jerr)
		return
	}
	m.writeChanByTextMessage(&b, "")
}
func (m *meeting) removeUser(userId string) {
	delete(m.participantMap, userId)
	var _, ok = m.participantMap[userId]
	if len(m.participantMap) == 0 {
		delete(meetings, m.createId)
		var _, mok = meetings[m.createId]
		fmt.Println("删除会议室", mok)
	}
	fmt.Println("退出参与者", ok)
}
func (m *meeting) writeChanByTextMessage(b *[]byte, own string) {
	for k, v := range m.participantMap {
		if k == own {
			continue
		}
		fmt.Println("byte2--->", k)
		var write byteChan
		write.ws = v.ws
		write.bytes = b
		write.participantId = v.id
		write.meetingId = m.createId
		write.weiteType = websocket.TextMessage
		writeSocketChan <- write
		//err := v.ws.WriteMessage(websocket.TextMessage, b)
		//if err != nil {
		//	fmt.Println("分配数据")
		//	fmt.Println(err)
		//	continue
		//}
	}
}
func (m *meeting) notifyUser(NUS *notifyUserStruct, participantId string) {
	b, err := json.Marshal(NUS)
	fmt.Println("aaaa", string(b))
	if err != nil {
		fmt.Println("json失败", err)
		return
	}
	m.writeChanByTextMessage(&b, participantId)

}
func (p *participant) set() {

}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  6144,
	WriteBufferSize: 6144,
}

type msg struct {
	Status    int    `json:"status"`
	MeetingId string `json:"meetingId"`
	Message   string `json:"message"`
}

func getMsg(status int, id string, message string) msg {
	var _msg msg
	_msg.Status = status
	_msg.MeetingId = id
	_msg.Message = message
	return _msg
}
func Create(c *gin.Context) {
	meetingName := c.Query("meetingName")
	meetingId := tool.RandomString(5) //生成邀请码
	var _meeting meeting
	_meeting.createName = meetingName
	_meeting.createId = meetingId
	_meeting.participantMap = make(map[string]*participant)
	meetings[meetingId] = &_meeting
	c.JSON(http.StatusOK, getMsg(1, meetingId, ""))

}
func Check(g *gin.Context) {
	meetingId := g.Query("inviteCode")
	name := g.Query("name")
	id := createMd5(name)
	if meeting, ok := meetings[meetingId]; ok {
		if _, o := meeting.participantMap[id]; o {
			g.JSON(http.StatusOK, getMsg(1, meetingId, "姓名重复"))
			return
		}
		g.JSON(http.StatusOK, getMsg(1, meetingId, ""))
	} else {
		g.JSON(http.StatusOK, getMsg(0, "", "会议室不存在"))
	}

}
func Join(g *gin.Context) {
	meetingId := g.Query("meetingId")
	name := g.Query("name")
	id := createMd5(name)
	fmt.Println(meetingId, "<---------->", name)
	c, err := upgrader.Upgrade(g.Writer, g.Request, nil)
	if err != nil {
		log.Println(err)
		return
	}
	if err != nil {
		fmt.Println("创建链接失败", err)
	}

	//会议室是否存在
	var meet, ok = meetings[meetingId]
	if ok {
		fmt.Println(meetingId, "<---------->", ok)
		//创建参与者
		var _participant participant
		_participant.ws = c
		_participant.id = id
		_participant.name = name
		meet.participantMap[id] = &_participant
		meet.notifyOthers(id)
	} else {
		err := c.WriteMessage(websocket.TextMessage, []byte("会议室不存在"))
		if err != nil {
			return
		}
		err1 := c.Close()
		if err1 != nil {
			return
		}
		return
	}
	for {
		_, msg, readErr := c.ReadMessage()
		if readErr != nil {
			fmt.Println("readErr")
			fmt.Println(readErr)
			meet.removeUser(id)
			var exitU notifyUserStruct
			exitU.Type = notifyExitUser
			exitU.Message = id
			meet.notifyUser(&exitU, id)
			break
		}
		if meeting, ok := meetings[meetingId]; len(msg) > 0 && ok {
			meeting.setMedia(id, msg)
		}
		//fmt.Println(string(msg))
	}

}
