# Prompts

AI tooling (Claude Code) was used while building this project. This file has two parts:

1. **Summary by branch:** the prompts and decisions that shaped each feature branch, in chronological order.
2. **Key prompts, verbatim:** the working rules given to the assistant and a selection of the prompts from the kickoff and from the final stretch of the project, copied exactly as written (in Spanish, the author's working language; everything produced in the repository is in English). Each one has a short note on what it led to.

## `feat/repo-scaffold`

- Project kickoff: shared the assignment brief and agreed on how to work (decisions first, code second).
- Decided stack and conventions: Go + Gin backend with exact decimal arithmetic, React + TypeScript + Vite frontend, one Dockerfile per side, everything written in English.
- Decided API shape: one `POST` endpoint per operation instead of a single `/calculate` endpoint.
- Decided workflow: one `feat/*` branch per mission, merged to `main` through a pull request once the mission's "done" criteria are met.
- Scaffolded the monorepo: `backend/` (Go module) and `frontend/` (Vite React-TS).

## `feat/backend-calculator-core`

- Implemented the pure calculator domain (add, subtract, multiply, divide) on top of `shopspring/decimal`, with table-driven tests covering exact decimals, negatives, large values and division by zero.

## `feat/backend-api`

- Implemented the Gin HTTP layer: one `POST` route per operation through a generic `binaryHandler`, JSON error contract (`400` malformed, `422` domain errors), configurable CORS, health check and graceful shutdown.
- Hardened operand parsing (plain decimals only, bounded length) after noticing exponent notation such as `1e999999999` could exhaust memory.
- Pinned Gin `v1.10.1` and `gin-contrib/cors` `v1.7.3` because the latest Gin forces `go 1.26` in `go.mod`.
- Review pass: documented the string-based numeric contract and its frontend implications, added a working checklist (`TODO.md`, removed at the end once its work was done), removed an accidentally committed binary (`backend/server`) and ignored it.

## `feat/backend-docker`

- Planned the branch (mission, "done" criteria, verification steps) before writing code, and chose an Alpine final image over distroless to keep the healthcheck inside the image.
- Wrote a multi-stage `backend/Dockerfile` (static build, non-root user, `HEALTHCHECK`, exec-form `ENTRYPOINT`) and a `.dockerignore`.
- Verified the image end to end: build, 16 MB size, non-root user, endpoints, `healthy` status and a clean `docker stop` (exit code 0 in about 1 second).

## `feat/frontend-ui`

- Designed the calculator as a pure reducer (string-only state, `pending` request instead of side effects) and wrote it test-first with table-driven tests and a small key-sequence DSL (`'2+3='`).
- Decided the interaction rules: left-to-right chaining like iOS, `2 + =` computes `2 + 2`, keypad locked while a request is in flight (only AC cancels it), digit cap of 12, and an `operand_too_long` error for results above 64 characters.
- Accepted a deliberate simplification: `±` pressed right after choosing an operator only changes the display.
- Built the `useCalculator` hook (aborts the request on AC, ignores stale answers), the iOS-style keypad and display, display-only number formatting, and component tests with Testing Library.
- Parked square root: `shopspring/decimal` has no native `Sqrt`, so it stays out of scope unless time remains after `percentage` and `power`.

## `feat/frontend-api-integration`

- Planned the branch first: a thin `fetch` client behind the existing `CalculateFn`, so the reducer, hook and components stay untouched.
- Decided the error mapping: branch on the backend `error.code` (never the message), treat an unknown code as `internal_error`, and any response without the backend's error envelope (proxy 502, HTML, empty body) as `network_error`. No timeout or retries: AC already cancels a request.
- Wrote the client test-first over a mocked `fetch` (request shape, string operands, every error code, malformed bodies), plus component tests that run the real client end to end for `0.1 + 0.2`, `1 / 3`, `1 / 0` and a failed request.
- Added the Vite dev proxy for `/api` and removed the temporary stub.
- Verified against the real backend in the browser: results, chaining, division by zero, recovery, and "Cannot reach the server" with the backend stopped.

## `feat/frontend-docker`

- Planned the branch first: multi-stage build with an unprivileged nginx (non-root, port 8080), a configurable `BACKEND_URL` rendered from nginx's template mechanism, and a compose file that publishes only the frontend and waits for the backend healthcheck.
- Accepted a trade-off: nginx resolves the backend host at startup, so the image on its own needs a resolvable `BACKEND_URL`. Resolving per request would add complexity the project does not need.
- Verified end to end: both images build (frontend 55 MB, backend 16 MB), both containers run as non-root and report `healthy`, the app works in the browser through nginx on port 3000, gzip and cache headers are correct, a stopped backend shows "Cannot reach the server", and `docker compose down` finishes in under a second.

## `feat/ci`

- Chose CI before the advanced operations to have a safety net while touching working code, and kept it minimal: one workflow on pull requests to `main`, with parallel `backend` (gofmt, vet, test) and `frontend` (lint, test, build) jobs.
- Ran every step locally first. `gofmt -l` flagged all Go files only because the Windows checkout had CRLF line endings (clean once normalized to LF), so a `.gitattributes` with `eol=lf` was added.
- Added a third `docker` job (compose build, `--wait` for both healthchecks, and a real request through nginx) so the Docker setup is verified end to end on every pull request.

## `feat/advanced-operations`

- Planned the branch in two independently shippable stretches: `percentage` (mandatory) first, then `power`. `sqrt` stays out of scope.
- Checked the decimal library before designing `power`: `PowInt32` returns an error only for `0^0`, but `0` to a negative power would divide by zero inside the library, so it is guarded before the call. Negative exponents are rounded to 16 decimals, like a division.
- Decided the contract: `percentage` is `value / 100` through `Shift(-2)` (exact), `power` takes an integer exponent with `|b| <= 1000`, and the new error code is `invalid_exponent` (`422`).
- Frontend: a one-operand pending request next to the binary one, `%` acting on the display and keeping the pending operator, and a new full-width `xʸ` row because the iOS keypad has no room for it.
- Designed end-to-end tests that run against the Docker stack through nginx with Node's built-in test runner (no new dependencies), covering every operation, the error contract and nginx behavior, and wired them into the CI `docker` job together with a backend-down check.

## `feat/docs-coverage`

- Planned the branch from measured data: Go coverage was measured first, and the frontend needed a coverage provider that was not installed yet.
- Added `@vitest/coverage-v8` and a `test:coverage` script, and summarized the coverage as text only in the README (no generated reports).
- Rewrote the README: real "Getting started" and "Testing and coverage" sections, an updated layout and stack, and design decisions for operations, frontend, Docker/nginx and known limitations. Every command in it was run before being documented.
- Added the key prompts, verbatim, to this file, and removed the working checklist (`TODO.md`) now that all its items were done.

## Key prompts (verbatim)

### Working rules given to the assistant

These rules were consolidated from the earlier prompts into the context prompt that opened the final working sessions. They apply to every branch.

> - **Git lo manejo yo.** No ejecutes ningún comando git, ni siquiera de lectura. Yo creo ramas, hago commits, push y merge.
> - Una rama `feat/*` por misión, con criterio de "listo". `main` está protegida y las ramas se borran al mergear.
> - **Todo artefacto en inglés** (código, comentarios, README, commits, PRs). A mí háblame en español.
> - PR en inglés con tres secciones: `Context`, `What has been changed?`, `How to test the changes?` (plantilla en `.github/pull_request_template.md`). En el cuerpo, los comandos van con sangría de 4 espacios, no con backticks.
> - No cometas reportes de cobertura ni carpetas generadas. En el README solo un resumen textual y los comandos.
> - Prefiero simplicidad: no sobreingeniería, no micro-iteraciones sobre bordes menores. Primero correctitud y completitud de lo requerido.
> - Docker y entorno están fuera del alcance del proyecto. Si algo se cae, yo lo levanto.
> - Antes de afirmar que algo funciona, ejecútalo (tests, build, navegador).

### Prompts

#### Kickoff and architecture (first sessions)

**Starting the work.** The first prompt, followed by the pasted assignment brief. It set the order of work: decisions first, code second. The assistant answered with default proposals and four open questions; the author chose exact decimal arithmetic, a calculator-style keypad, English for everything in the repository, and Docker with incremental commits.

> Hola, el día de hoy estaré trabajando en este asset de Sezzle, esta es la consigna inicial. Primero haremos una parte de tomar decisiones y establecer cómo trabajaremos, y luego empezamos con el código, va?

**Structure, workflow, UI and framework.** Led to the monorepo with one Dockerfile per side, the `feat/*` branch-per-mission workflow, the iOS-style UI, and Gin for the HTTP layer (the assistant was asked for its pros and cons first).

> Antes de eso. Ciertamente separamos front y back, a pesar de que sea mono repo, quiero que cada uno tenga su dockerfile y se puedan levantar por separado. Quiero que me propongas una estructura para el back acotada al alcance de este proyecto. Haremos lo siguiente, vamos a priorizar las operaciones necesarias, pero quiero que diseñemos de tal forma que si vamos bien de tiempo, se puedan añadir las otras funcionalidades, cómo raices, exponentes y porcentajes. basta con decir que absoludamente todo es en inglés. yo me encargo de correr los comandos en general, sobre todo con git. Usaremos una metodología sencilla, quiero que para mandar cualquier cosa a main, antes creemos una nueva rama feat/**, cada rama debe tener un propósito, una misión, y nos basaremos en eso para definir si se cumplió el objetivo de la rama y tirar PR.
>
> Para la UI no estaba pensando en nada exotico, pensaba en un estilo clean y sencillo como la calculadora dummy de IOS. Qué dices?
>
> Para luego no tener muchos problemas con CORS, pensaba utilizar gin-gonic/gin, qué opinas? dame pros y contras.

**Scope of the advanced operations, coverage, CI and infrastructure.** Settled that `percentage` is mandatory, that `power` and `sqrt` are built only if the decimal library supports them natively (no hand-written numeric algorithms), the semantics of both, the rule against committing coverage output, the CI branch, and that the environment is out of the assistant's scope.

> Bueno bro, mira:
> Primero: Rama 4 (Advanced Operations): Haremos `percentage` sí o sí para completar la UI de iOS. Para `sqrt` y `power`, las implementaremos SOLO SI la librería `shopspring/decimal` proporciona métodos nativos para ello (ej. un método para exponentes enteros). No implementaremos algoritmos matemáticos manuales (como Newton-Raphson); si la librería no lo soporta de caja, descartamos esas dos operaciones para proteger nuestro timebox.
> Segundo: Semántica de operaciones: Totalmente de acuerdo. `percentage = value / 100` y `power` limitado a exponentes enteros acotados (`|b| <= 1000`) es una excelente decisión de seguridad.
> Tercero: Docs y Cobertura: Escribe solo un resumen textual en el `README.md` e incluye los comandos para generarlos. Estrictamente PROHIBIDO commitear archivos HTML o carpetas autogeneradas de cobertura al repositorio.
> Cuarto: GitHub Actions (CI): Perfecto, agrega una rama rápida `feat/ci` antes de la documentación final con un workflow sencillo que ejecute el linter y los tests de Go y Node en cada PR a `main`. Además, desde el comienzo establecí protección a main y la autoeliminación de ramas al mergear para no llenar el repo de ramas que no se vuelven a utilizar
> Regla estricta sobre infraestructura (Docker/WSL): Mi entorno WSL2 y Docker están perfectamente configurados y funcionando. Simplemente que ultimamente he tenido problemas con el wsl, y con docker, no están rindiendo igual. No obstante, eso se sale del alcance del proyecto que estamos llevando a cabo, simplemente si se cae, yo lo levanto, y si necesitas ver algo, yo te lo muestro.
>
> Por favor, actualiza el `TODO.md` con estas respuestas y arranquemos inmediatamente con la misión de `feat/frontend-ui`. Dame el código del Reducer y sus tests de tabla primero.

**Git is the author's.** Turned into the first working rule above, and the assistant stopped running even read-only git commands.

> no, tu no tocas git, de eso me encargo yo

**Accepting a simplification and parking square root.** Accepted that `±` pressed right after an operator only changes the display (to avoid low-value micro-iterations), and parked `sqrt` behind `percentage` and `power`.

> Todo bien con el reducer, sigue con el hook y los componentes. Sobre tus consultas, estoy de acuerdo con el border case, con esa simplificación nos ahorramos perder tiempo con micro iteraciones complejas que no aportan mayor valor al asset. Primero va la correctitud y completitud de las feature iniciales.
>
> Sobre lo de la raíz, por ahora la dejamos fuera del alcance, aunque si me interesa un plan para adaprtalo en caso de tener tiempo despué de implementar y probar percentage y power. Déjalo pendinte

**Losing the work and leaving WSL.** The first frontend branch was lost to repeated WSL crashes. This prompt asked for a plan to redo it on Windows and a context prompt for a fresh session, which is where the working rules above came from.

> bro, nada de esto aparece hecho, pero no entraremos en este tema, necesito rehacer todo lo de feat/frontend-ui, pero he estado teniendo demasiados problemas con el wsl, no para de colapsar, y ya he reiniciado 8 veces en lo que va del asset, no perderé más tiempo por esto, así que me pasaré a mi windows, quiero que me des el plan de trabajo para hgacer lo de esta rama, y el contexto necesario para seguir con el proyecto ne otrochat que apunte a mi windows. Usa lo menos quepuedas el wsl

#### Final stretch (Windows)

**Moving the work to Windows and verifying before continuing.** After repeated WSL crashes, the author asked for a diagnosis and then chose to work on Windows. Before building anything on top, they asked to review everything first. The review showed the frontend was intact and all checks passed.

> es impresionante, seguro no te has dado cuenta, pero toda esta jornada se ha estado cayendo el wsl ubuntu, ya he reiniciado el pc una 5 veces, hagamos un pequeño diagnostico. Estaba intentando trabajar en mi wsl en la carpeta, pero de verdad está fallando demasiado, creo que mejor usaremos mi windows, no me aguanto una reiniciada de PC más.

> sí, es verdad, sino que por los problemas que etsuve teniendo, preferí ser cuidadoso y que se revise todo antes de proceder. Sabiendo que todo está bien, ya estamos en la nueva rama de la api, haz el plan de trabajo para esta rama

**Installing the toolchain the work needed.** Led to Go 1.23.8 on Windows, matching `go.mod`, so the real backend could run next to the frontend.

> pues el backend ya estaba dockerizado, debería poderse levantar, y tienes razón, no tengo go en windows ahora, porfa instalalo para poder hacer el trabajo de esta rama

**Docker for the frontend.** Led to the nginx image, the `BACKEND_URL` setting and the compose file.

> sí, prepara el plan de feat/frontend-docker. Si está en el .gitignore, Ya probé todo y va perfecto.

**CI first, to protect working code.** The author proposed doing CI before the advanced operations, and then asked to keep the Docker build in it. Led to the three-job workflow (`backend`, `frontend`, `docker`).

> Propongo que hagamos lo de ci, además así tendremos una seguridad extra cuando montemos las operaciones avanzadas, para prevenir dañar algo que funciona

> yo sé que estamos un tris cortos de tiempo, pero podemos dejar el build de docker en el ci, está funcionando perfecto, y prefiero garantizar que la parte de docker esté perfecta de principio a fin

**Advanced operations and end-to-end tests.** Led to `percentage` and `power`, and to the `e2e/` suite that runs against the Docker stack through nginx.

> Ya creé la rama, empieza con el tramo A. Si, me parece bien la nueva fila

> Dale, ya lo probé, antes de seguir,sugiereme un commit, luego sigue con el caso B. considerando que ahora tenemos nuevas operaciones, que todo está dockerizado y que usamos nginx, me parece pertinente diseñar pruebas e2e para algunos casos, incluyendo edge cases

**Reporting a failing CI job.** The author pasted the log of the failing `docker` job (the step that stops the backend ended with exit code 1 after about a minute). The assistant traced it to nginx's 60 second connect timeout, which Linux runners hit and Docker Desktop does not, and fixed both the timeout (`proxy_connect_timeout 5s`) and the check.

> hay un error bro: (log of the failing `docker` job)

**Documentation and cleanup.** Led to this README's final structure, the coverage summary, this file, and the removal of the working checklist.

> Ya creé la rama, usa la opción b y sí borra TODO.md
