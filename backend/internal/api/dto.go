package api

import (
	"fmt"
	"regexp"

	"github.com/shopspring/decimal"
)

// Error codes returned in the API error body.
const (
	codeInvalidRequest     = "invalid_request"
	codeInvalidOperand     = "invalid_operand"
	codeDivisionByZero     = "division_by_zero"
	codeInvalidExponent    = "invalid_exponent"
	codeNegativeSquareRoot = "negative_square_root"
	codeResultTooLong      = "result_too_long"
	codeInternal           = "internal_error"
)

// maxOperandLength bounds the size of a single operand string. Results are
// held to the same bound, so every result can be the operand of the next call.
const maxOperandLength = 64

// operandPattern accepts plain decimal notation only. Exponent notation such
// as "1e999999999" is rejected on purpose: it is tiny on the wire but can make
// the decimal library allocate huge numbers.
var operandPattern = regexp.MustCompile(`^-?\d+(\.\d+)?$`)

// binaryRequest is the body of every binary operation (add, subtract, ...).
// Operands are JSON strings to preserve decimal precision.
type binaryRequest struct {
	A string `json:"a" binding:"required"`
	B string `json:"b" binding:"required"`
}

type resultResponse struct {
	Result string `json:"result"`
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorResponse struct {
	Error errorBody `json:"error"`
}

func newErrorResponse(code, message string) errorResponse {
	return errorResponse{Error: errorBody{Code: code, Message: message}}
}

// parseOperand converts a request string into a decimal, naming the offending
// field in the error message.
func parseOperand(field, value string) (decimal.Decimal, error) {
	if len(value) > maxOperandLength || !operandPattern.MatchString(value) {
		return decimal.Decimal{}, fmt.Errorf("%q must be a decimal number such as \"12\" or \"-0.5\" (max %d characters)", field, maxOperandLength)
	}
	return decimal.NewFromString(value)
}
