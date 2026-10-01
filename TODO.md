# TODO

Working checklist so no detail gets lost. Remove items (or the whole file) before final delivery if they no longer add value.

## Branches

- [x] `feat/repo-scaffold`
- [x] `feat/backend-calculator-core`
- [x] `feat/backend-api`
- [x] `feat/backend-docker`
- [ ] `feat/frontend-ui`: iOS-style keypad, display and state, with mocked results
- [ ] `feat/frontend-api-integration`: API client, loading and error handling against the real backend
- [ ] `feat/frontend-docker`: Dockerfile with nginx (static files + `/api` proxy) and a root `docker-compose.yml`
- [ ] `feat/advanced-operations` (optional): `power`, `sqrt`, `percentage`
- [ ] `feat/docs-coverage`: final README, coverage reports for both layers

## Frontend must respect the string contract

The API takes and returns numbers as strings (see "Numeric precision" in the README). The frontend has to be strict about it:

- [ ] Never use `Number()`, `parseFloat`, `+value` or JS arithmetic on operands or results. Values stay strings from keypad to display to request. Type them as `string` (consider a branded `DecimalString` type).
- [ ] Send operands as JSON **strings** (`{"a": "0.1", "b": "0.2"}`); a JSON number is rejected with `400 invalid_request`.
- [ ] Normalize input to the accepted format `^-?\d+(\.\d+)?$` before sending: `.5` becomes `0.5`, `5.` becomes `5`, no `+` sign, no exponent notation.
- [ ] Cap the number of digits the user can type (the backend accepts at most 64 characters per operand).
- [ ] Handle results that are longer than 64 characters: a product of two long operands can exceed the limit when fed back as an operand (chained operations). Decide what to show (error or truncation) and test it.
- [ ] Format only for display (for example thousands separators or shrinking the font), never for the value that is kept and sent.
- [ ] Branch on `error.code`, not on `error.message`: `invalid_request`, `invalid_operand` (`400`), `division_by_zero` (`422`), `internal_error` (`500`). Show a friendly message for each.
- [ ] Division results arrive rounded to 16 decimal places without trailing zeros; make sure the display handles long decimals.
- [ ] Add a test that proves `0.1 + 0.2` reaches the display as `0.3`.

## Backend

- [ ] Unary handler (`{"value": "..."}`) when `sqrt` lands.
- [ ] Define the semantics of `percentage` before implementing it (iOS-style unary `%` or binary "a% of b"), and document it.
- [ ] Decide how `power` bounds its inputs so a request cannot blow up memory or CPU (large exponents, non-integer exponents).
- [ ] `sqrt` of a negative number is a domain error (`422`); add its error code to the API table in the README.
- [ ] Decide the precision for `sqrt` and fractional powers (not exact with decimals) and document it.

## Docker and environment

- [x] Backend image: multi-stage, non-root, 16 MB, healthcheck, graceful stop.
- [ ] Frontend image: nginx serves the build and proxies `/api` to the backend service; backend URL configurable.
- [ ] `docker compose up` runs both; each image also builds and runs on its own.
- [ ] Vite dev server proxies `/api` to `localhost:8080`.

## Documentation

- [ ] README: "Getting started" (backend, frontend, Docker) and "Testing and coverage" are still _TBD_.
- [ ] README: tech stack and design decisions updated whenever a decision changes.
- [ ] `PROMPTS.md`: today it holds a summary of the prompts per branch. Before delivery, consider adding the key prompts verbatim, since the assignment asks to share them.
- [ ] Replace the Vite template content in `frontend/` (`App.tsx`, CSS, assets) and write the frontend setup notes in the README.
- [ ] Coverage reports for both layers (`go test -coverprofile`, Vitest coverage).
