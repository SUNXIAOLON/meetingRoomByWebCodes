package routes

import (
	"github.com/gin-gonic/gin"
)

type RouterType func(*gin.Engine)

var routes []RouterType

func AppendRoute(router RouterType) {

	routes = append(routes, router)
}
func Get() []RouterType {
	return routes
}
