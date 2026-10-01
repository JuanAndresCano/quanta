package calculator

import (
	"errors"
	"strings"
	"testing"

	"github.com/shopspring/decimal"
)

func TestSqrt(t *testing.T) {
	tests := []struct{ name, value, want string }{
		{"perfect square", "16", "4"},
		{"zero", "0", "0"},
		{"one", "1", "1"},
		{"irrational, rounded to 16 decimals", "2", "1.414213562373095"},
		{"decimal perfect square", "0.25", "0.5"},
		{"small value", "0.0001", "0.01"},
		{"exact for a large perfect square", "12345678987654321", "111111111"},
		{"64-digit operand rounds up to 10^32", strings.Repeat("9", 64), "1" + strings.Repeat("0", 32)},
		{"below the rounding scale", "0." + strings.Repeat("0", 40) + "1", "0"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := Sqrt(decimal.RequireFromString(tc.value))
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.String() != tc.want {
				t.Errorf("result = %s, want %s", got, tc.want)
			}
		})
	}
}

func TestSqrtNegative(t *testing.T) {
	_, err := Sqrt(decimal.RequireFromString("-4"))
	if !errors.Is(err, ErrNegativeSquareRoot) {
		t.Fatalf("err = %v, want ErrNegativeSquareRoot", err)
	}
}
