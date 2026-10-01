package calculator

import "github.com/shopspring/decimal"

// Percentage returns value / 100. Moving the decimal point is exact, so unlike
// a division it never rounds.
func Percentage(value decimal.Decimal) (decimal.Decimal, error) {
	return value.Shift(-2), nil
}
