package calculator

import (
	"math/big"

	"github.com/shopspring/decimal"
)

// sqrtPrecision is the binary precision used for square roots. 256 bits are
// about 77 significant decimal digits, more than a 64-character operand needs.
const sqrtPrecision = 256

// Sqrt returns the square root of value rounded to DivisionScale decimal
// places, using the standard library's big.Float.Sqrt. It returns
// ErrNegativeSquareRoot when value is negative.
func Sqrt(value decimal.Decimal) (decimal.Decimal, error) {
	if value.IsNegative() {
		return decimal.Decimal{}, ErrNegativeSquareRoot
	}

	// Neither conversion can fail: value.String() and Text('f', ...) always
	// produce a plain decimal. Four extra digits leave the final rounding to the
	// decimal library, like every other operation.
	f, _ := new(big.Float).SetPrec(sqrtPrecision).SetString(value.String())
	root := decimal.RequireFromString(new(big.Float).SetPrec(sqrtPrecision).Sqrt(f).Text('f', DivisionScale+4))
	return root.Round(DivisionScale), nil
}
