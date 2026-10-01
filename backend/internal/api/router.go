// Package api is the HTTP layer: routing, request validation and mapping of
// domain results and errors to JSON responses.
package api

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/JuanAndresCano/quanta/backend/internal/calculator"
)

// NewRouter builds the HTTP router. When allowedOrigins is empty no CORS
// headers are sent, which is the right default behind a same-origin proxy.
func NewRouter(allowedOrigins []string) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	_ = r.SetTrustedProxies(nil)

	if len(allowedOrigins) > 0 {
		r.Use(cors.New(cors.Config{
			AllowOrigins: allowedOrigins,
			AllowMethods: []string{"GET", "POST", "OPTIONS"},
			AllowHeaders: []string{"Content-Type"},
		}))
	}

	r.GET("/healthz", healthHandler)

	v1 := r.Group("/api/v1")
	v1.POST("/add", binaryHandler(calculator.Add))
	v1.POST("/subtract", binaryHandler(calculator.Subtract))
	v1.POST("/multiply", binaryHandler(calculator.Multiply))
	v1.POST("/divide", binaryHandler(calculator.Divide))

	return r
}
