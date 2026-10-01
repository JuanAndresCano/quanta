package api

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestPercentage(t *testing.T) {
	r := NewRouter(nil)

	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantResult string
		wantCode   string
	}{
		{name: "whole number", body: `{"value":"50"}`, wantStatus: 200, wantResult: "0.5"},
		{name: "negative", body: `{"value":"-12.5"}`, wantStatus: 200, wantResult: "-0.125"},
		{name: "keeps full precision", body: `{"value":"0.1234567890123456789"}`, wantStatus: 200, wantResult: "0.001234567890123456789"},

		{name: "malformed json", body: `{"value":`, wantStatus: 400, wantCode: codeInvalidRequest},
		{name: "missing value", body: `{}`, wantStatus: 400, wantCode: codeInvalidRequest},
		{name: "wrong field name", body: `{"a":"1"}`, wantStatus: 400, wantCode: codeInvalidRequest},
		{name: "number instead of string", body: `{"value":50}`, wantStatus: 400, wantCode: codeInvalidRequest},
		{name: "non numeric value", body: `{"value":"abc"}`, wantStatus: 400, wantCode: codeInvalidOperand},
		{name: "exponent notation rejected", body: `{"value":"1e5"}`, wantStatus: 400, wantCode: codeInvalidOperand},
		{name: "value too long", body: `{"value":"` + strings.Repeat("9", 65) + `"}`, wantStatus: 400, wantCode: codeInvalidOperand},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			w := post(t, r, "/api/v1/percentage", tc.body)
			if w.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d (body: %s)", w.Code, tc.wantStatus, w.Body)
			}

			if tc.wantResult != "" {
				var got resultResponse
				if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
					t.Fatalf("invalid JSON: %v", err)
				}
				if got.Result != tc.wantResult {
					t.Errorf("result = %q, want %q", got.Result, tc.wantResult)
				}
				return
			}

			var got errorResponse
			if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
				t.Fatalf("invalid JSON: %v", err)
			}
			if got.Error.Code != tc.wantCode {
				t.Errorf("error code = %q, want %q", got.Error.Code, tc.wantCode)
			}
		})
	}
}

func TestPercentageRejectsBinaryBody(t *testing.T) {
	w := post(t, NewRouter(nil), "/api/v1/percentage", `{"a":"1","b":"2"}`)
	if w.Code != 400 {
		t.Fatalf("status = %d, want 400", w.Code)
	}
}

func TestSqrt(t *testing.T) {
	r := NewRouter(nil)

	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantResult string
		wantCode   string
	}{
		{name: "perfect square", body: `{"value":"16"}`, wantStatus: 200, wantResult: "4"},
		{name: "rounded to 16 decimals", body: `{"value":"2"}`, wantStatus: 200, wantResult: "1.414213562373095"},
		{name: "zero", body: `{"value":"0"}`, wantStatus: 200, wantResult: "0"},

		{name: "negative value", body: `{"value":"-4"}`, wantStatus: 422, wantCode: codeNegativeSquareRoot},
		{name: "missing value", body: `{}`, wantStatus: 400, wantCode: codeInvalidRequest},
		{name: "number instead of string", body: `{"value":16}`, wantStatus: 400, wantCode: codeInvalidRequest},
		{name: "non numeric value", body: `{"value":"abc"}`, wantStatus: 400, wantCode: codeInvalidOperand},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			w := post(t, r, "/api/v1/sqrt", tc.body)
			if w.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d (body: %s)", w.Code, tc.wantStatus, w.Body)
			}

			if tc.wantResult != "" {
				var got resultResponse
				if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
					t.Fatalf("invalid JSON: %v", err)
				}
				if got.Result != tc.wantResult {
					t.Errorf("result = %q, want %q", got.Result, tc.wantResult)
				}
				return
			}

			var got errorResponse
			if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
				t.Fatalf("invalid JSON: %v", err)
			}
			if got.Error.Code != tc.wantCode {
				t.Errorf("error code = %q, want %q", got.Error.Code, tc.wantCode)
			}
		})
	}
}
