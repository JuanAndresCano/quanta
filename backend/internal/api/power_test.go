package api

import (
	"encoding/json"
	"testing"
)

func TestPower(t *testing.T) {
	r := NewRouter(nil)

	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantResult string
		wantCode   string
	}{
		{name: "integer power", body: `{"a":"2","b":"10"}`, wantStatus: 200, wantResult: "1024"},
		{name: "decimal base", body: `{"a":"1.5","b":"2"}`, wantStatus: 200, wantResult: "2.25"},
		{name: "negative exponent", body: `{"a":"2","b":"-2"}`, wantStatus: 200, wantResult: "0.25"},
		{name: "exponent zero", body: `{"a":"7","b":"0"}`, wantStatus: 200, wantResult: "1"},
		{name: "largest power of 2 that fits", body: `{"a":"2","b":"212"}`, wantStatus: 200, wantResult: "6582018229284824168619876730229402019930943462534319453394436096"},
		{name: "one more digit is too long", body: `{"a":"2","b":"213"}`, wantStatus: 422, wantCode: codeResultTooLong},
		{name: "2^1000 is too long", body: `{"a":"2","b":"1000"}`, wantStatus: 422, wantCode: codeResultTooLong},
		{name: "tiny result too long", body: `{"a":"0.1","b":"64"}`, wantStatus: 422, wantCode: codeResultTooLong},

		{name: "zero to a negative power", body: `{"a":"0","b":"-1"}`, wantStatus: 422, wantCode: codeDivisionByZero},
		{name: "zero to the power of zero", body: `{"a":"0","b":"0"}`, wantStatus: 422, wantCode: codeInvalidExponent},
		{name: "fractional exponent", body: `{"a":"2","b":"0.5"}`, wantStatus: 422, wantCode: codeInvalidExponent},
		{name: "exponent above the limit", body: `{"a":"2","b":"1001"}`, wantStatus: 422, wantCode: codeInvalidExponent},
		{name: "exponent below the limit", body: `{"a":"2","b":"-1001"}`, wantStatus: 422, wantCode: codeInvalidExponent},

		{name: "missing exponent", body: `{"a":"2"}`, wantStatus: 400, wantCode: codeInvalidRequest},
		{name: "number instead of string", body: `{"a":2,"b":3}`, wantStatus: 400, wantCode: codeInvalidRequest},
		{name: "invalid operand", body: `{"a":"x","b":"3"}`, wantStatus: 400, wantCode: codeInvalidOperand},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			w := post(t, r, "/api/v1/power", tc.body)
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
			if got.Error.Message == "" {
				t.Error("error message is empty")
			}
		})
	}
}
