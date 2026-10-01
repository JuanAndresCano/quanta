package calculator

import "errors"

// Domain errors. They describe mathematically invalid requests and are
// translated to HTTP responses by the API layer.
var (
	ErrDivisionByZero  = errors.New("division by zero")
	ErrInvalidExponent = errors.New("invalid exponent")
)
