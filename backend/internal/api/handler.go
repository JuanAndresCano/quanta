package api

import (
	"errors"
	"fmt"
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
		writeResult(c, result)
	}
}

// writeResult answers with the result, or with 422 result_too_long when it
// would not be accepted back as an operand (for example 2^1000, 302 digits).
func writeResult(c *gin.Context, result decimal.Decimal) {
	s := result.String()
	if len(s) > maxOperandLength {
		c.JSON(http.StatusUnprocessableEntity, newErrorResponse(codeResultTooLong,
			fmt.Sprintf("the result has more than %d characters", maxOperandLength)))
		return
	}
	c.JSON(http.StatusOK, resultResponse{Result: s})
}

// writeDomainError translates a domain error into an HTTP response.
func writeDomainError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, calculator.ErrDivisionByZero):
		c.JSON(http.StatusUnprocessableEntity, newErrorResponse(codeDivisionByZero, err.Error()))
	case errors.Is(err, calculator.ErrInvalidExponent):
		c.JSON(http.StatusUnprocessableEntity, newErrorResponse(codeInvalidExponent, err.Error()))
	case errors.Is(err, calculator.ErrNegativeSquareRoot):
		c.JSON(http.StatusUnprocessableEntity, newErrorResponse(codeNegativeSquareRoot, err.Error()))
	default:
		_ = c.Error(err)
		c.JSON(http.StatusInternalServerError, newErrorResponse(codeInternal, "internal server error"))
	}
}

func healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
