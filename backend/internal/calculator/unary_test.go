package calculator

import (
	"testing"

	"github.com/shopspring/decimal"
)

func TestPercentage(t *testing.T) {
	tests := []struct{ name, value, want string }{
		{"whole number", "50", "0.5"},
		{"hundred", "100", "1"},
		{"zero", "0", "0"},
		{"negative", "-25", "-0.25"},
		{"decimal", "12.5", "0.125"},
		{"smaller than one", "0.5", "0.005"},
		{"more than 16 decimals stays exact", "0.1234567890123456789", "0.001234567890123456789"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := Percentage(decimal.RequireFromString(tc.value))
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.String() != tc.want {
				t.Errorf("result = %s, want %s", got, tc.want)
			}
		})
	}
}
