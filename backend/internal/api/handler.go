package api

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"

	"github.com/JuanAndresCano/quanta/backend/internal/calculator"
)

// binaryOperation is the shape of every two-operand domain function.
type binaryOperation func(a, b decimal.Decimal) (decimal.Decimal, error)

// binaryHandler adapts a domain operation to a Gin handler: it parses and
// validates the body, runs the operation and maps domain errors to HTTP.
func binaryHandler(op binaryOperation) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req binaryRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, newErrorResponse(codeInvalidRequest,
				`body must be a JSON object with string fields "a" and "b"`))
			return
		}

		a, err := parseOperand("a", req.A)
		if err != nil {
			c.JSON(http.StatusBadRequest, newErrorResponse(codeInvalidOperand, err.Error()))
			return
		}
		b, err := parseOperand("b", req.B)
		if err != nil {
			c.JSON(http.StatusBadRequest, newErrorResponse(codeInvalidOperand, err.Error()))
			return
		}

		result, err := op(a, b)
		if err != nil {
			writeDomainError(c, err)
			return
		}
		c.JSON(http.StatusOK, resultResponse{Result: result.String()})
	}
}

// writeDomainError translates a domain error into an HTTP response.
func writeDomainError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, calculator.ErrDivisionByZero):
		c.JSON(http.StatusUnprocessableEntity, newErrorResponse(codeDivisionByZero, err.Error()))
	case errors.Is(err, calculator.ErrInvalidExponent):
		c.JSON(http.StatusUnprocessableEntity, newErrorResponse(codeInvalidExponent, err.Error()))
	default:
		_ = c.Error(err)
		c.JSON(http.StatusInternalServerError, newErrorResponse(codeInternal, "internal server error"))
	}
}

func healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
