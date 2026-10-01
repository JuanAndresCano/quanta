package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() { gin.SetMode(gin.TestMode) }

func post(t *testing.T, r http.Handler, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestOperations(t *testing.T) {
	r := NewRouter(nil)

	tests := []struct {
		name       string
		path       string
		body       string
		wantStatus int
		wantResult string
		wantCode   string
	}{
		{name: "add", path: "/api/v1/add", body: `{"a":"0.1","b":"0.2"}`, wantStatus: 200, wantResult: "0.3"},
		{name: "subtract", path: "/api/v1/subtract", body: `{"a":"5","b":"7.5"}`, wantStatus: 200, wantResult: "-2.5"},
		{name: "multiply", path: "/api/v1/multiply", body: `{"a":"-3","b":"4"}`, wantStatus: 200, wantResult: "-12"},
		{name: "divide", path: "/api/v1/divide", body: `{"a":"1","b":"3"}`, wantStatus: 200, wantResult: "0.3333333333333333"},

		{name: "division by zero", path: "/api/v1/divide", body: `{"a":"1","b":"0"}`, wantStatus: 422, wantCode: codeDivisionByZero},

		{name: "malformed json", path: "/api/v1/add", body: `{"a":`, wantStatus: 400, wantCode: codeInvalidRequest},
		{name: "missing operand", path: "/api/v1/add", body: `{"a":"1"}`, wantStatus: 400, wantCode: codeInvalidRequest},
		{name: "empty body", path: "/api/v1/add", body: ``, wantStatus: 400, wantCode: codeInvalidRequest},
		{name: "number instead of string", path: "/api/v1/add", body: `{"a":1,"b":2}`, wantStatus: 400, wantCode: codeInvalidRequest},
		{name: "non numeric operand", path: "/api/v1/add", body: `{"a":"abc","b":"1"}`, wantStatus: 400, wantCode: codeInvalidOperand},
		{name: "exponent notation rejected", path: "/api/v1/multiply", body: `{"a":"1e999999999","b":"2"}`, wantStatus: 400, wantCode: codeInvalidOperand},
		{name: "operand too long", path: "/api/v1/add", body: `{"a":"` + strings.Repeat("9", 65) + `","b":"1"}`, wantStatus: 400, wantCode: codeInvalidOperand},
		{name: "unknown operation", path: "/api/v1/modulo", body: `{"a":"1","b":"2"}`, wantStatus: 404},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			w := post(t, r, tc.path, tc.body)
			if w.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d (body: %s)", w.Code, tc.wantStatus, w.Body)
			}
			if tc.wantStatus == http.StatusNotFound {
				return
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

func TestMethodNotAllowedOnOperation(t *testing.T) {
	r := NewRouter(nil)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/add", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusNotFound && w.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want 404 or 405", w.Code)
	}
}

func TestHealth(t *testing.T) {
	r := NewRouter(nil)
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
}

func TestCORS(t *testing.T) {
	const origin = "http://localhost:5173"

	preflight := func(r http.Handler, from string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodOptions, "/api/v1/add", nil)
		req.Header.Set("Origin", from)
		req.Header.Set("Access-Control-Request-Method", "POST")
		req.Header.Set("Access-Control-Request-Headers", "content-type")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}

	t.Run("allowed origin", func(t *testing.T) {
		w := preflight(NewRouter([]string{origin}), origin)
		if got := w.Header().Get("Access-Control-Allow-Origin"); got != origin {
			t.Errorf("Allow-Origin = %q, want %q", got, origin)
		}
	})

	t.Run("disallowed origin", func(t *testing.T) {
		w := preflight(NewRouter([]string{origin}), "http://evil.example")
		if got := w.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("Allow-Origin = %q, want empty", got)
		}
	})

	t.Run("cors disabled by default", func(t *testing.T) {
		w := preflight(NewRouter(nil), origin)
		if got := w.Header().Get("Access-Control-Allow-Origin"); got != "" {
			t.Errorf("Allow-Origin = %q, want empty", got)
		}
	})
}
