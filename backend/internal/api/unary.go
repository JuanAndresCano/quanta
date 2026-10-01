package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

// unaryRequest is the body of every one-operand operation (percentage, sqrt).
// The operand is a JSON string to preserve decimal precision.
type unaryRequest struct {
	Value string `json:"value" binding:"required"`
}

// unaryOperation is the shape of every one-operand domain function.
type unaryOperation func(value decimal.Decimal) (decimal.Decimal, error)

// unaryHandler is the one-operand counterpart of binaryHandler.
func unaryHandler(op unaryOperation) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req unaryRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, newErrorResponse(codeInvalidRequest,
				`body must be a JSON object with a string field "value"`))
			return
		}

		value, err := parseOperand("value", req.Value)
		if err != nil {
			c.JSON(http.StatusBadRequest, newErrorResponse(codeInvalidOperand, err.Error()))
			return
		}

		result, err := op(value)
		if err != nil {
			writeDomainError(c, err)
			return
		}
		writeResult(c, result)
	}
}
