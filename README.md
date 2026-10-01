# Calculator

A full-stack calculator: a React + TypeScript frontend that consumes a Go REST API.

## Scope

| Operation | Priority |
|---|---|
| Addition, subtraction, multiplication, division | Required |
| Exponentiation, percentage | Optional, built |
| Square root | Optional, not built (the decimal library has no native square root) |

## Repository layout

```
.
├── backend/              # Go REST API (Gin), independently buildable and runnable
├── frontend/             # React + TypeScript (Vite), served by nginx in Docker
├── e2e/                  # End-to-end tests against the Docker stack
├── coverage/             # HTML coverage reports (snapshot of the submitted version)
├── .github/              # CI workflow and pull request template
├── docker-compose.yml    # Runs backend and frontend together
├── README.md
└── PROMPTS.md            # AI prompts used while building this project
```

Backend layout:

```
backend/
├── cmd/server/          # entrypoint: configuration, wiring, graceful shutdown
└── internal/
    ├── calculator/      # pure domain logic (no HTTP, no Gin)
    └── api/             # Gin layer: routing, validation, error mapping
```

Frontend layout:

```
frontend/src/
├── calculator/   # pure state machine: types, reducer, operand and display helpers
├── api/          # fetch client for the backend
├── hooks/        # useCalculator: connects the reducer to the API client
└── components/   # Display, Keypad, Key
```

Each side has its own `Dockerfile`, so the frontend and the backend can be built and run separately or together.

## Tech stack

- **Backend:** Go 1.23, Gin, `shopspring/decimal` for exact decimal arithmetic
- **Frontend:** React 19, TypeScript, Vite, oxlint, Vitest + Testing Library (jsdom)
- **Packaging:** Docker (one image per side, nginx in front of the app, plus a compose file to run both)
- **CI:** GitHub Actions

## Getting started

Requirements: Go 1.23+ and Node 22+ to run the code directly, or just Docker to run everything in containers.

### With Docker (one command)

```bash
docker compose up --build
```

Open http://localhost:3000. Details in "Run everything with Docker Compose" below.

### For development

Run the two sides in separate terminals:

```bash
# Terminal 1: the API on http://localhost:8080
cd backend
go run ./cmd/server

# Terminal 2: the UI on http://localhost:5173
cd frontend
npm ci
npm run dev
```

The Vite dev server proxies `/api` to `localhost:8080`, so the browser sees a single origin and no CORS configuration is needed.

Frontend scripts (run from `frontend/`):

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload and the `/api` proxy |
| `npm run build` | Type-check and production build into `dist/` |
| `npm run lint` | oxlint |
| `npm test` | Unit and component tests (Vitest) |
| `npm run test:coverage` | The same tests with a coverage summary |

## API

Base path: `/api/v1`. Every operation is a `POST` with a JSON body. Operands are **strings** holding plain decimal numbers (`"12"`, `"-0.5"`; no exponent notation, max 64 characters) so no precision is lost on the wire.

| Endpoint | Body | Result |
|---|---|---|
| `POST /api/v1/add` | `{"a": "0.1", "b": "0.2"}` | `a + b` |
| `POST /api/v1/subtract` | `{"a": "5", "b": "3"}` | `a - b` |
| `POST /api/v1/multiply` | `{"a": "4", "b": "3"}` | `a * b` |
| `POST /api/v1/divide` | `{"a": "1", "b": "3"}` | `a / b`, rounded to 16 decimal places |
| `POST /api/v1/percentage` | `{"value": "12.5"}` | `value / 100`, exact (`0.125`) |
| `POST /api/v1/power` | `{"a": "2", "b": "10"}` | `a ^ b`, integer exponent with `\|b\| <= 1000`; a negative exponent is rounded to 16 decimal places |
| `GET /healthz` | - | `{"status": "ok"}` |

Success (`200`):

```json
{"result": "0.3"}
```

Errors always have the same shape:

```json
{"error": {"code": "division_by_zero", "message": "division by zero"}}
```

| Status | `code` | When |
|---|---|---|
| `400` | `invalid_request` | Body is not valid JSON, an operand is missing, or an operand is not a JSON string |
| `400` | `invalid_operand` | An operand is not a plain decimal number (or is too long) |
| `422` | `division_by_zero` | The request is well formed but mathematically impossible (`1 / 0`, or `0` to a negative power) |
| `422` | `invalid_exponent` | `power` with a fractional exponent, `\|b\| > 1000`, or `0 ^ 0` |
| `404` | - | Unknown operation |
| `500` | `internal_error` | Unexpected failure |

Examples:

```bash
curl -s -X POST localhost:8080/api/v1/add \
  -H 'Content-Type: application/json' -d '{"a": "0.1", "b": "0.2"}'
# {"result":"0.3"}

curl -s -X POST localhost:8080/api/v1/divide \
  -H 'Content-Type: application/json' -d '{"a": "1", "b": "0"}'
# {"error":{"code":"division_by_zero","message":"division by zero"}}
```

Backend configuration (environment variables):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Port the server listens on |
| `CORS_ALLOWED_ORIGINS` | _(empty)_ | Comma-separated origins allowed by CORS. Empty means no CORS headers, which is correct behind a same-origin proxy |

Run the backend with `cd backend && go run ./cmd/server`.

### Backend with Docker

The backend builds and runs on its own; its build context is `backend/`.

```bash
docker build -t calculator-backend ./backend
docker run --rm -p 8080:8080 calculator-backend
curl localhost:8080/healthz
```

Configuration is passed as environment variables, for example `docker run -e PORT=9000 -e CORS_ALLOWED_ORIGINS=http://localhost:5173 -p 9000:9000 calculator-backend`.

The image is a multi-stage build: a `golang:1.23-alpine` stage compiles a static binary, and the final `alpine` image only contains that binary. It runs as a non-root user, declares a `HEALTHCHECK` on `/healthz`, and uses the exec form of `ENTRYPOINT` so `docker stop` delivers `SIGTERM` and triggers the server's graceful shutdown.

### Frontend with Docker

The frontend image serves the production build with nginx and forwards `/api` to the backend, so the browser only ever talks to one origin. Its build context is `frontend/`.

```bash
docker build -t calculator-frontend ./frontend
docker run --rm -p 3000:8080 -e BACKEND_URL=http://host.docker.internal:8080 calculator-frontend
```

`BACKEND_URL` is the address nginx proxies `/api` to (default `http://backend:8080`, the service name in the compose file). nginx resolves that host when it starts, so run on its own the container needs a `BACKEND_URL` that resolves, for example the backend published on the host as above; with the unresolvable default it refuses to start.

The image is a multi-stage build: a `node:22-alpine` stage runs `npm ci` and `npm run build`, and the final `nginxinc/nginx-unprivileged` image only contains the static files and the nginx config. It runs as a non-root user and listens on port 8080 inside the container. Hashed files under `/assets/` are cached for a year and `index.html` is never cached.

### Run everything with Docker Compose

```bash
docker compose up --build
```

Open http://localhost:3000. Compose starts the backend first and waits for its healthcheck before starting the frontend. Only the frontend is published (port 3000); the backend is reachable from it through the compose network. Stop everything with `docker compose down`.

## End-to-end tests

`e2e/` holds tests that run against the real Docker stack, through nginx, using Node's built-in test runner (no extra dependencies). They cover every operation and its edge cases, the error contract (malformed bodies, bad operand formats, exponent limits), and nginx behavior (HTML not cached, hashed assets cached, no `index.html` fallback for missing assets or unknown API routes, the 1 MB body limit, concurrent requests).

```bash
docker compose up --build --detach --wait
node --test "e2e/*.test.mjs"
docker compose down
```

Set `E2E_BASE_URL` to test another address (default `http://localhost:3000`).

## Testing and coverage

There are three layers of tests. All of them run in CI.

| Layer | What it checks | Command |
|---|---|---|
| Backend | Table-driven domain tests (exact decimals, edge cases) and API tests through `httptest` (status codes, error contract, validation) | `cd backend && go test ./...` |
| Frontend | The state machine as table-driven tests, the API client over a mocked `fetch`, and the whole UI with Testing Library | `cd frontend && npm test` |
| End to end | The real Docker stack through nginx (see above) | `node --test "e2e/*.test.mjs"` |

### Coverage

A snapshot of the HTML reports from the submitted version is committed under `coverage/`:

- Backend: [`coverage/backend.html`](coverage/backend.html), line by line per Go file
- Frontend: [`coverage/frontend/index.html`](coverage/frontend/index.html), per file with statement and branch detail

They are a snapshot, not regenerated by CI. To regenerate them, or to get the same data locally (the default local outputs `coverage.out`, `coverage.html` and `frontend/coverage/` are git-ignored):

```bash
# Backend: per-function summary, plus an HTML view if you want one
cd backend
go test -coverprofile=coverage.out ./...
go tool cover -func=coverage.out
go tool cover -html=coverage.out

# Frontend: summary printed in the terminal
cd frontend
npm run test:coverage
```

Summary of the last run:

| Part | Coverage |
|---|---|
| Backend `internal/calculator` (domain) | 95.0% of statements |
| Backend `internal/api` (HTTP layer) | 89.3% of statements |
| Frontend (`src/`) | 99.3% statements, 99.2% branches, 100% functions, 100% lines |

`backend/cmd/server` (`main`: configuration, wiring and graceful shutdown) has no unit tests, which is why the backend total over all packages is 69.0%; it is exercised by the end-to-end tests and by the container healthcheck. In the HTTP layer the uncovered code is the `500` fallback for unexpected errors.

## Continuous integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every pull request to `main`, with three jobs in parallel:

- **`backend`:** `gofmt` check, `go vet ./...` and `go test ./...` (Go version read from `backend/go.mod`).
- **`frontend`:** `npm ci`, `npm run lint`, `npm test` and `npm run build` (Node 22).
- **`docker`:** builds both images, starts the stack with `docker compose up --wait` (so both healthchecks must pass), runs the end-to-end tests through nginx and checks that nginx fails fast with a gateway error (`502` or `504`) while still serving the app when the backend is down.

To make them mandatory, require the `backend`, `frontend` and `docker` status checks in the branch protection rule of `main`. The same commands can be run locally from `backend/` and `frontend/`.

## Design decisions

The main decisions and the reasons behind them.

### Architecture

- **Monorepo, independent deployables.** `backend/` and `frontend/` share nothing but the HTTP contract.
- **Domain separated from transport.** The calculation logic (`internal/calculator`) knows nothing about HTTP or Gin; the API layer (`internal/api`) only translates requests into domain calls and domain errors into HTTP responses. Gin is confined to the API layer.
- **Idiomatic Go, no framework ceremony.** No dependency injection container or repository layer: there is no state to manage. Dependencies are passed explicitly.
- **Same-origin first, CORS as a fallback.** In development the Vite dev server proxies `/api`, and in Docker the frontend's nginx proxies it, so the browser sees a single origin. CORS stays available through `CORS_ALLOWED_ORIGINS` for deployments where the two sides live on different origins, and is off by default.
- **Dependency pinning.** Gin `v1.10.1` and `gin-contrib/cors` `v1.7.3` are pinned because newer Gin releases raise the `go` directive in `go.mod` to `1.26`; the project targets Go 1.23.

### Numeric precision (the string contract)

- **Exact decimal arithmetic.** The backend computes with `shopspring/decimal`, so `0.1 + 0.2` is exactly `0.3`, which binary floating point cannot do.
- **Numbers travel as JSON strings, in both directions.** A JSON number would be parsed into a float64 by most clients (including `JSON.parse` in the browser) and the precision would be lost before it reaches the API. Sending a JSON number instead of a string is rejected with `400 invalid_request`.
- **Strict operand format.** Operands must match `^-?\d+(\.\d+)?$` and be at most 64 characters: no `+` sign, no `.5` or `5.`, no exponent notation. Exponent notation is rejected on purpose because `"1e999999999"` is tiny on the wire but can make the decimal library allocate huge numbers.
- **Division rounds to 16 decimal places.** `1/3` returns `0.3333333333333333`. Results are returned without trailing zeros.
- **Consequences for the frontend.** The frontend must never convert operands or results with `Number()`, `parseFloat` or arithmetic: values live as strings from the keypad to the display and the request. It also has to normalize what the user types into the accepted format (for example `.5` becomes `0.5`, `5.` becomes `5`) and cap the input length.

### API design

- **One endpoint per operation.** `POST /api/v1/add`, `/subtract`, `/multiply`, `/divide` (plus `/percentage` and `/power`). The URL states the intent, each operation has its own typed body (`{a, b}` for binary operations, `{value}` for unary ones), and unknown operations are a plain `404`. A calculator has no real resources, so this is RPC over HTTP either way; per-operation routes keep the contract explicit instead of hiding a `switch` behind a single `/calculate` endpoint.
- **`POST` with a JSON body, not `GET`.** Operands are decimal strings, which are cleaner in a body than in a query string.
- **Thin, explicit routing.** The domain exposes pure functions with the same shape per arity. The router maps each route to a generic handler, so adding an operation is one domain function plus one route line. Binary operations take `{a, b}` and unary ones take `{value}`, each with its own generic handler.
- **Two classes of failure, two status codes.** `400` means the request itself is malformed (bad JSON, missing or invalid operand); `422` means it is well formed but mathematically impossible (division by zero). Every error has the same `{"error": {"code", "message"}}` body, and clients should branch on `code`, not on `message`.

### Operations

- **`percentage` is exact.** `value / 100` is computed by shifting the decimal point (`Shift(-2)`), so it never rounds, unlike a division.
- **`power` only uses what the decimal library offers.** It relies on `PowInt32`, with no hand-written numeric algorithm. The exponent must be an integer with `|b| <= 1000`, otherwise `422 invalid_exponent`. The library fails on `0^0` (reported as `invalid_exponent`) and would divide by zero for `0` to a negative power, so that case is guarded before the call and reported as `division_by_zero`. A negative exponent is rounded to 16 decimal places, like a division. The worst allowed input (a 64-digit base to the power of 1000) answers in milliseconds.
- **Square root is not built.** `shopspring/decimal` has no native `Sqrt`, and a hand-written algorithm (for example Newton-Raphson) was ruled out to keep the scope small and the arithmetic delegated to the library. Adding it would take a domain function, a `422` for negative input, a unary route and a key.

### Frontend

- **The calculator is a pure state machine.** The reducer never calls the API: when an operation must be computed it leaves a `pending` request in the state, and the `useCalculator` hook sends it and dispatches the answer. This keeps the interaction rules testable as plain tables, with no mocks and no timers.
- **Strings from the keypad to the request.** The state, the display and the requests hold strings only; nothing is converted to a JS number. Typing is capped at 12 digits, and a result longer than 64 characters that is reused as an operand shows "Number too long" instead of calling the backend.
- **Left-to-right chaining, like iOS.** `2 + 3 ×` computes `2 + 3` before applying the `×`, and `2 + =` computes `2 + 2`. Two operators in a row replace each other.
- **The keypad locks while a request is in flight.** Only AC works: it aborts the request, and a late answer is ignored.
- **`%` acts on the display and keeps the pending operator.** `200 + 10 % =` is `200.1`. It is not the iOS behavior, where the percentage is relative to the first operand.
- **`xʸ` has its own full-width row**, because the iOS keypad has no room for a power key.
- **Errors are branched on `error.code`.** Each code has a friendly message. Any response that is not the backend's own error body (a gateway error, an HTML page, an empty body) or a failed request is shown as "Cannot reach the server". There are no client timeouts or retries: the user cancels with AC.

### Docker and nginx

- **Multi-stage builds and no root.** The backend is a static binary on `alpine` (16 MB); the frontend is the Vite build served by `nginx-unprivileged` (55 MB). Both run as a non-root user and declare a healthcheck.
- **nginx serves the app and proxies `/api`.** The backend address is `BACKEND_URL`. nginx resolves it at startup, so the frontend image on its own needs a resolvable value. A `proxy_connect_timeout` of 5 seconds makes it fail fast when the backend is unreachable instead of waiting for nginx's 60 second default.
- **Cache policy.** Hashed files under `/assets/` are cached for a year; `index.html` is never cached.
- **Compose publishes only the frontend** (port 3000) and starts it after the backend is healthy.

### Known limitations

- Square root is not built (see "Operations").
- `±` pressed right after choosing an operator only changes the display, and after `%` a new operator replaces the pending one instead of evaluating.
- A result of around 24 digits is wider than a phone screen; the display scrolls horizontally instead of shrinking further.
- There is no authentication or rate limiting, which is out of scope for a calculator.

## Workflow

Nothing goes straight to `main`. Every change lives in a `feat/*` branch with a single, explicit mission. A branch is ready for a pull request when its mission's "done" criteria are met.
