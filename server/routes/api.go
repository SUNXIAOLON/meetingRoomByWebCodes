package routes

import (
	"github.com/gin-gonic/gin"
	"meetingServer/module/Meeting"
	"net/http"
)

func ApiInit() {
	AppendRoute(API)
}
func API(r *gin.Engine) {
	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", gin.H{
			"title": "Main website",
		})
	})
	r.GET("/meetingCreate", Meeting.Create)
	r.GET("/meetingCheck", Meeting.Check)
	r.GET("/meetingJoin", Meeting.Join)

}
