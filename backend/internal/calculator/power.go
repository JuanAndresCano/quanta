package calculator

import (
	"fmt"

	"github.com/shopspring/decimal"
)

// MaxExponent bounds |b| in Power so a single request cannot ask for an
// enormous result.
const MaxExponent = 1000

// Power returns a raised to the integer power b, using the decimal library's
// own PowInt32. The exponent must be an integer with |b| <= MaxExponent
// (ErrInvalidExponent otherwise); 0 raised to a negative power is a division
// by zero, and 0 to the power of 0 is undefined. Negative exponents are
// rounded to DivisionScale decimal places, like a division.
func Power(a, b decimal.Decimal) (decimal.Decimal, error) {
	if !b.IsInteger() || b.Abs().GreaterThan(decimal.NewFromInt(MaxExponent)) {
		return decimal.Decimal{}, fmt.Errorf("%w: it must be an integer between -%d and %d", ErrInvalidExponent, MaxExponent, MaxExponent)
	}
	exp := int32(b.IntPart())

	if a.IsZero() {
		switch {
		case exp == 0:
			return decimal.Decimal{}, fmt.Errorf("%w: 0 to the power of 0 is undefined", ErrInvalidExponent)
		case exp < 0:
			// PowInt32 would divide by zero here.
			return decimal.Decimal{}, ErrDivisionByZero
		}
	}

	result, err := a.PowInt32(exp)
	if err != nil {
		return decimal.Decimal{}, err
	}
	if exp < 0 {
		result = result.Round(DivisionScale)
	}
	return result, nil
}
