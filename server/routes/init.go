package routes

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

func Router() *gin.Engine {
	ApiInit()
	r := gin.Default() //初始化
	r.Use(cors())
	var rlist = Get()
	for _, route := range rlist {
		route(r)
	}
	//r.GET("/", service.Login)
	r.LoadHTMLGlob("templates/**/*")
	r.StaticFS("/static", http.Dir("static"))
	return r
}
func cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "*")
		c.Writer.Header().Set("Authorization", "*")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		//  set http method to "GET" if an incoming request is "HEAD"
		if c.Request.Method == "HEAD" {
			c.Request.Method = "GET"
		}

		c.Next()
	}
}
