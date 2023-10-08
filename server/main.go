package main

import (
	"fmt"
	"meetingServer/routes"
)

func main() {
	r := routes.Router()
	if err := r.Run(":8082"); err == nil {

	} else {
		fmt.Print("路由初始化失败", err)
	}
}
