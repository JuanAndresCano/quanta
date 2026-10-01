# TODO

Working checklist so no detail gets lost. Remove items (or the whole file) before final delivery if they no longer add value.

## Ground rules

- One `feat/*` branch per mission; it is ready for a PR when its "done" criteria are met. `main` is protected and merged branches are deleted automatically.
- Git is handled by the repository owner, never by the AI assistant.
- Coverage: only a textual summary plus the commands to generate it go in the README. **Never commit HTML reports or generated coverage folders** (already covered by `.gitignore`; keep it that way).
- Environment (WSL2 and Docker) is outside the scope of the project: if it breaks, the owner restarts it.

## Branches

- [x] `feat/repo-scaffold`
- [x] `feat/backend-calculator-core`
- [x] `feat/backend-api`
- [x] `feat/backend-docker`
- [ ] `feat/frontend-ui`: iOS-style keypad, display and state, no real backend yet
  - [x] Pure reducer (`src/calculator/`) with table-driven tests
  - [ ] `useCalculator` hook: effect that sends the `pending` request and dispatches `resolve` / `fail`; ignore stale answers (cancel in the effect cleanup, so an answer from before an AC cannot resolve a newer request)
  - [ ] Components (`Display`, `Keypad`, `Key`), iOS styling, responsive layout
  - [ ] Display formatting (`format.ts`): thousands separators and font shrinking, display only
  - [ ] Component tests (Vitest + Testing Library + jsdom)
  - [ ] Remove the Vite template content (`App.tsx`, CSS, assets)
- [ ] `feat/frontend-api-integration`: API client, loading and error handling against the real backend, Vite proxy for `/api`
- [ ] `feat/frontend-docker`: Dockerfile with nginx (static files + `/api` proxy) and a root `docker-compose.yml`
- [ ] `feat/advanced-operations`: see "Advanced operations" below
- [ ] `feat/ci`: GitHub Actions workflow
- [ ] `feat/docs-coverage`: final README, coverage summary, prompts

## Frontend must respect the string contract

The API takes and returns numbers as strings (see "Numeric precision" in the README). The frontend has to be strict about it:

- [x] Never use `Number()`, `parseFloat`, `+value` or JS arithmetic on operands or results (reducer: values are strings end to end, covered by tests).
- [ ] Send operands as JSON **strings** (`{"a": "0.1", "b": "0.2"}`); a JSON number is rejected with `400 invalid_request`. (API client)
- [x] Normalize input to the accepted format `^-?\d+(\.\d+)?$` before sending: `.5` becomes `0.5`, `5.` becomes `5`, `-0` becomes `0` (`normalizeOperand`).
- [x] Cap the number of digits the user can type (`MAX_DIGITS = 12`).
- [x] Results longer than 64 characters: reusing one as an operand shows `operand_too_long` instead of calling the backend.
- [ ] Format only for display (thousands separators, shrinking the font), never for the value that is kept and sent.
- [ ] Branch on `error.code`, not on `error.message`: `invalid_request`, `invalid_operand` (`400`), `division_by_zero` (`422`), `internal_error` (`500`), plus client-side `network_error` and `operand_too_long`. Show a friendly message for each.
- [ ] Division results arrive rounded to 16 decimal places without trailing zeros; make sure the display handles long decimals.
- [ ] Add a test that proves `0.1 + 0.2` reaches the display as `0.3` through the API client.

## Advanced operations

Decisions taken:

- `percentage` is mandatory (it completes the iOS keypad): `POST /api/v1/percentage` with `{"value": "..."}` returns `value / 100`.
- `power` and `sqrt` are implemented **only if `shopspring/decimal` provides a native method for them**. No hand-written numeric algorithms (no Newton-Raphson); if the library does not support it out of the box, the operation is dropped to protect the timebox.
- `power` is limited to integer exponents with `|b| <= 1000`; a fractional or out-of-range exponent is a `422`.

Findings so far (`shopspring/decimal` v1.4.0):

- `PowInt32` exists, so `power` qualifies.
- There is no `Sqrt` method. The only possible route is `Pow` with exponent `0.5`; decide whether that counts as native support before implementing it.

Tasks:

- [ ] Unary handler (`{"value": "..."}`) in the API layer.
- [ ] `percentage` in the domain, API, tests and README; reducer action and `%` key in the frontend.
- [ ] `power`: bounded exponent, error code and README entry.
- [ ] `sqrt`: only if the decision above says yes; negative input is a domain error (`422`) with its own code.
- [ ] Update the API table, error table and design decisions in the README.

## Docker and environment

- [x] Backend image: multi-stage, non-root, 16 MB, healthcheck, graceful stop.
- [ ] Frontend image: nginx serves the build and proxies `/api` to the backend service; backend URL configurable.
- [ ] `docker compose up` runs both; each image also builds and runs on its own.
- [ ] Vite dev server proxies `/api` to `localhost:8080`.

## CI (`feat/ci`)

- [ ] Workflow triggered on pull requests to `main`.
- [ ] Backend job: `gofmt` check, `go vet`, `go test ./...` (Go version taken from `go.mod`).
- [ ] Frontend job: `npm ci`, `npm run lint`, `npm test`, `npm run build` (Node 22).
- [ ] Mention the required checks in the README, and note that the branch protection rule on `main` can require them.

## Documentation

- [ ] README: "Getting started" (backend, frontend, Docker) and "Testing and coverage" are still _TBD_.
- [ ] README: textual coverage summary and the commands to generate the reports (no committed reports).
- [ ] README: tech stack and design decisions updated whenever a decision changes (frontend state machine, chaining behavior, digit cap).
- [ ] `PROMPTS.md`: today it holds a summary of the prompts per branch. Before delivery, add the key prompts verbatim, since the assignment asks to share them.
- [ ] Write the frontend setup notes in the README.
- [ ] Final cleanliness pass over both layers, as done for the backend.
