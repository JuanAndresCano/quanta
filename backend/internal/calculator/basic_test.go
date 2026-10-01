package calculator

import (
	"errors"
	"testing"

	"github.com/shopspring/decimal"
)

type binaryOp func(a, b decimal.Decimal) (decimal.Decimal, error)

type binaryCase struct {
	name    string
	a, b    string
	want    string
	wantErr error
}

func runBinaryCases(t *testing.T, op binaryOp, cases []binaryCase) {
	t.Helper()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := op(decimal.RequireFromString(tc.a), decimal.RequireFromString(tc.b))
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("error = %v, want %v", err, tc.wantErr)
			}
			if tc.wantErr != nil {
				return
			}
			if got.String() != tc.want {
				t.Errorf("result = %s, want %s", got, tc.want)
			}
		})
	}
}

func TestAdd(t *testing.T) {
	runBinaryCases(t, Add, []binaryCase{
		{name: "integers", a: "2", b: "3", want: "5"},
		{name: "exact decimals", a: "0.1", b: "0.2", want: "0.3"},
		{name: "negative", a: "-5", b: "3", want: "-2"},
		{name: "zero", a: "0", b: "7.5", want: "7.5"},
		{name: "large values", a: "99999999999999999999", b: "1", want: "100000000000000000000"},
	})
}

func TestSubtract(t *testing.T) {
	runBinaryCases(t, Subtract, []binaryCase{
		{name: "integers", a: "5", b: "3", want: "2"},
		{name: "exact decimals", a: "0.3", b: "0.1", want: "0.2"},
		{name: "negative result", a: "3", b: "5", want: "-2"},
		{name: "same values", a: "1.5", b: "1.5", want: "0"},
	})
}

func TestMultiply(t *testing.T) {
	runBinaryCases(t, Multiply, []binaryCase{
		{name: "integers", a: "4", b: "3", want: "12"},
		{name: "exact decimals", a: "0.1", b: "0.2", want: "0.02"},
		{name: "negative", a: "-2", b: "3", want: "-6"},
		{name: "by zero", a: "123.45", b: "0", want: "0"},
	})
}

func TestDivide(t *testing.T) {
	runBinaryCases(t, Divide, []binaryCase{
		{name: "exact", a: "10", b: "4", want: "2.5"},
		{name: "negative", a: "-9", b: "3", want: "-3"},
		{name: "non terminating is rounded", a: "1", b: "3", want: "0.3333333333333333"},
		{name: "zero numerator", a: "0", b: "5", want: "0"},
		{name: "division by zero", a: "1", b: "0", wantErr: ErrDivisionByZero},
		{name: "zero by zero", a: "0", b: "0", wantErr: ErrDivisionByZero},
	})
}
