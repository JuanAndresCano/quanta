package calculator

import (
	"strings"
	"testing"

	"github.com/shopspring/decimal"
)

func TestPower(t *testing.T) {
	runBinaryCases(t, Power, []binaryCase{
		{name: "integer power", a: "2", b: "10", want: "1024"},
		{name: "exponent zero", a: "7", b: "0", want: "1"},
		{name: "exponent one", a: "-7.5", b: "1", want: "-7.5"},
		{name: "negative base, odd exponent", a: "-2", b: "3", want: "-8"},
		{name: "negative base, even exponent", a: "-2", b: "2", want: "4"},
		{name: "decimal base", a: "1.5", b: "2", want: "2.25"},
		{name: "exponent written as 2.0", a: "3", b: "2.0", want: "9"},
		{name: "zero base", a: "0", b: "5", want: "0"},
		{name: "one to the max exponent", a: "1", b: "1000", want: "1"},
		{name: "negative exponent", a: "2", b: "-2", want: "0.25"},
		{name: "negative exponent rounds like a division", a: "3", b: "-1", want: "0.3333333333333333"},

		{name: "zero to the power of zero", a: "0", b: "0", wantErr: ErrInvalidExponent},
		{name: "zero to a negative power", a: "0", b: "-1", wantErr: ErrDivisionByZero},
		{name: "fractional exponent", a: "2", b: "0.5", wantErr: ErrInvalidExponent},
		{name: "exponent above the limit", a: "2", b: "1001", wantErr: ErrInvalidExponent},
		{name: "exponent below the limit", a: "2", b: "-1001", wantErr: ErrInvalidExponent},
	})
}

func TestPowerAtTheLimit(t *testing.T) {
	got, err := Power(decimal.RequireFromString("2"), decimal.RequireFromString("1000"))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// 2^1000 has 302 digits and starts with 1071508607.
	if s := got.String(); len(s) != 302 || !strings.HasPrefix(s, "1071508607") {
		t.Errorf("2^1000 = %s...", s[:20])
	}
}
