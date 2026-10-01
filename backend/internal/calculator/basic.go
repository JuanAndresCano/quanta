// Package calculator holds the pure arithmetic domain logic. It knows nothing
// about HTTP: operations take decimals and return a decimal or a domain error.
package calculator

import "github.com/shopspring/decimal"

// DivisionScale is the number of decimal places kept when a division does not
// terminate (e.g. 1/3).
const DivisionScale = 16

// Add returns a + b.
func Add(a, b decimal.Decimal) (decimal.Decimal, error) {
	return a.Add(b), nil
}

// Subtract returns a - b.
func Subtract(a, b decimal.Decimal) (decimal.Decimal, error) {
	return a.Sub(b), nil
}

// Multiply returns a * b.
func Multiply(a, b decimal.Decimal) (decimal.Decimal, error) {
	return a.Mul(b), nil
}

// Divide returns a / b rounded to DivisionScale decimal places.
// It returns ErrDivisionByZero when b is zero.
func Divide(a, b decimal.Decimal) (decimal.Decimal, error) {
	if b.IsZero() {
		return decimal.Decimal{}, ErrDivisionByZero
	}
	return a.DivRound(b, DivisionScale), nil
}
