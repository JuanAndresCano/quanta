# Prompts

I built this project with Claude Code as a pair programmer: Claude Sonnet 5.5 (medium effort) for the build, and Claude Opus 5.5 for the final review and the changes that came out of it. This file explains how I used it and quotes the prompts that shaped the result.

My prompts are quoted verbatim in Spanish, my working language; `[…]` marks a cut. Everything in the repository itself is in English.

## How I worked with the assistant

- **Decisions first, code second.** Each branch started with a plan from the assistant (mission, "done" criteria, verification steps). I approved it or changed it before any code was written.
- **The assistant proposes, I decide.** For the stack, scope, API shape, numeric contract and interaction rules, I asked for options with pros and cons and chose between them. The main decisions I made are listed below.
- **I own git.** I created every branch and wrote every commit and pull request myself. `main` is protected, and every change went through a `feat/*` branch with a single mission.
- **Nothing is "done" until it runs.** Before calling something finished, the assistant had to run it: tests, build, the browser or the Docker stack.

These rules were consolidated into the context prompt I used to open each working session:

> - **Git lo manejo yo.** No ejecutes ningún comando git, ni siquiera de lectura. Yo creo ramas, hago commits, push y merge.
> - Una rama `feat/*` por misión, con criterio de "listo". `main` está protegida y las ramas se borran al mergear.
> - **Todo artefacto en inglés** (código, comentarios, README, commits, PRs). A mí háblame en español.
> - Prefiero simplicidad: no sobreingeniería, no micro-iteraciones sobre bordes menores. Primero correctitud y completitud de lo requerido.
> - Antes de afirmar que algo funciona, ejecútalo (tests, build, navegador).

## Decisions I made

| Decision | What I chose | Why |
|---|---|---|
| Repository | Monorepo, but frontend and backend each with their own Dockerfile | Each side can be built, run and deployed on its own |
| HTTP framework | Gin, after asking for pros and cons | Small, idiomatic, CORS middleware available |
| Arithmetic | Exact decimals (`shopspring/decimal`), numbers as JSON strings | `0.1 + 0.2` must be `0.3` in a calculator |
| Advanced operations | `percentage` always; `power` and `sqrt` only with library support, never hand-written | No hand-written numeric algorithms inside a 2–4 hour timebox |
| Edge cases | Accepted that `±` right after an operator only changes the display | It avoided low-value micro-iterations |
| Order of work | CI before the advanced operations | A safety net before touching working code |
| Quality | Kept the Docker build in CI and added end-to-end tests through nginx | Once everything was containerized, I wanted it verified end to end |

## Prompts by stage

### Kickoff and architecture

**Starting the work.** I shared the brief and set the order: decisions first, code second.

> Hola, el día de hoy estaré trabajando en este asset de Sezzle, esta es la consigna inicial. Primero haremos una parte de tomar decisiones y establecer cómo trabajaremos, y luego empezamos con el código, va?

**Structure, workflow, UI and framework.** This led to the monorepo with one Dockerfile per side, the branch-per-mission workflow, the iOS-style UI and Gin.

> Antes de eso. Ciertamente separamos front y back, a pesar de que sea mono repo, quiero que cada uno tenga su dockerfile y se puedan levantar por separado. Quiero que me propongas una estructura para el back acotada al alcance de este proyecto. Haremos lo siguiente, vamos a priorizar las operaciones necesarias, pero quiero que diseñemos de tal forma que si vamos bien de tiempo, se puedan añadir las otras funcionalidades, cómo raices, exponentes y porcentajes. […] Usaremos una metodología sencilla, quiero que para mandar cualquier cosa a main, antes creemos una nueva rama feat/**, cada rama debe tener un propósito, una misión, y nos basaremos en eso para definir si se cumplió el objetivo de la rama y tirar PR.
>
> Para la UI no estaba pensando en nada exotico, pensaba en un estilo clean y sencillo como la calculadora dummy de IOS. Qué dices?
>
> Para luego no tener muchos problemas con CORS, pensaba utilizar gin-gonic/gin, qué opinas? dame pros y contras.

**Scope of the advanced operations.** This set the rule against hand-written algorithms, the semantics of `percentage` and `power`, and the CI branch.

> Primero: Rama 4 (Advanced Operations): Haremos `percentage` sí o sí para completar la UI de iOS. Para `sqrt` y `power`, las implementaremos SOLO SI la librería `shopspring/decimal` proporciona métodos nativos para ello (ej. un método para exponentes enteros). No implementaremos algoritmos matemáticos manuales (como Newton-Raphson); si la librería no lo soporta de caja, descartamos esas dos operaciones para proteger nuestro timebox.
> Segundo: Semántica de operaciones: Totalmente de acuerdo. `percentage = value / 100` y `power` limitado a exponentes enteros acotados (`|b| <= 1000`) es una excelente decisión de seguridad.
> […]
> Cuarto: GitHub Actions (CI): Perfecto, agrega una rama rápida `feat/ci` antes de la documentación final con un workflow sencillo que ejecute el linter y los tests de Go y Node en cada PR a `main`. […]

### Frontend

**Accepting a simplification and parking square root.**

> Todo bien con el reducer, sigue con el hook y los componentes. Sobre tus consultas, estoy de acuerdo con el border case, con esa simplificación nos ahorramos perder tiempo con micro iteraciones complejas que no aportan mayor valor al asset. Primero va la correctitud y completitud de las feature iniciales.
>
> Sobre lo de la raíz, por ahora la dejamos fuera del alcance, aunque si me interesa un plan para adaprtalo en caso de tener tiempo despué de implementar y probar percentage y power. Déjalo pendinte

**An environment problem, and verifying before continuing.** Partway through, WSL kept crashing and the first version of `feat/frontend-ui` was lost. I moved the work to native Windows. Before building anything new, I asked for a full review of what already existed. It confirmed that the frontend was intact and every check passed, and only then did I continue.

> sí, es verdad, sino que por los problemas que etsuve teniendo, preferí ser cuidadoso y que se revise todo antes de proceder. Sabiendo que todo está bien, ya estamos en la nueva rama de la api, haz el plan de trabajo para esta rama

### CI, Docker and advanced operations

**CI first, to protect working code.** This led to the three-job workflow (`backend`, `frontend`, `docker`).

> Propongo que hagamos lo de ci, además así tendremos una seguridad extra cuando montemos las operaciones avanzadas, para prevenir dañar algo que funciona

> yo sé que estamos un tris cortos de tiempo, pero podemos dejar el build de docker en el ci, está funcionando perfecto, y prefiero garantizar que la parte de docker esté perfecta de principio a fin

**Advanced operations and end-to-end tests.** I split the branch into two stretches, `percentage` and then `power`, and asked for e2e tests once the stack ran behind nginx.

> Dale, ya lo probé, antes de seguir,sugiereme un commit, luego sigue con el caso B. considerando que ahora tenemos nuevas operaciones, que todo está dockerizado y que usamos nginx, me parece pertinente diseñar pruebas e2e para algunos casos, incluyendo edge cases

**A failing CI job.** I pasted the log of the failing `docker` job: the backend-down check exited with code 1 after about a minute. The cause was nginx's default 60 second connect timeout, which GitHub's Linux runners hit and Docker Desktop does not. The fix was `proxy_connect_timeout 5s` and a tighter check.

### Review before submitting

Before merging the last branch, I switched to Claude Opus 5.5 and asked for a critical review of the project against the brief. A different, stronger model gave me a second opinion that had not been part of building the project.

> bro, quiero que leas la consigna completa y me hagas un burn honesto sobre el trabajo que hice en comparación con lo que me pidieron

It led to these changes:

- Committing a snapshot of the HTML coverage reports under `coverage/`, because the brief lists a coverage report as a deliverable.
- Building `sqrt` with the standard library's `math/big.Float.Sqrt`. It respects the "no hand-written algorithms" rule, which had only been checked against the decimal library.
- Making `%` behave like iOS (`200 + 10 % =` is 220, not 200.1).
- Rewriting this file.

**A bug I found by hand.** While testing the app, I chained a very large power, and the page froze. I reported it like this:

> Bro, por cierto, intenté hacer un cálculo súper grande y se quedó pegada y se bloqueo, pero no debería avisar que es un error? Tipo, al igual que en la división entre 0.

The assistant reproduced it in the browser before touching any code. The backend answered in milliseconds. The cause was in the frontend: a chained power returned a 64,000-digit result, and formatting and drawing it blocked the page for about 3.4 seconds. The fix applies the operand limit to results as well. A result longer than 64 characters is now `422 result_too_long`, shown as "Result too long", in the same way as a division by zero.

## Summary by branch

| Branch | Outcome |
|---|---|
| `feat/repo-scaffold` | Monorepo with `backend/` (Go module) and `frontend/` (Vite React-TS); stack, conventions and API shape decided |
| `feat/backend-calculator-core` | Pure domain (add, subtract, multiply, divide) on `shopspring/decimal`, with table-driven tests |
| `feat/backend-api` | Gin layer: one `POST` per operation, `400`/`422` error contract, CORS, health check, graceful shutdown; operands hardened against exponent notation such as `1e999999999` |
| `feat/backend-docker` | Multi-stage, non-root, 16 MB image with a healthcheck and clean `SIGTERM` handling |
| `feat/frontend-ui` | Pure reducer written test-first, `useCalculator` hook, iOS-style keypad and display |
| `feat/frontend-api-integration` | `fetch` client that branches on `error.code`, Vite dev proxy, tested against the real backend |
| `feat/frontend-docker` | nginx-unprivileged image proxying `/api`, plus the compose file |
| `feat/ci` | GitHub Actions with `backend`, `frontend` and `docker` jobs; `.gitattributes` to fix CRLF on Windows |
| `feat/advanced-operations` | `percentage` and bounded `power` end to end, and the e2e suite through nginx |
| `feat/docs-coverage` | Final README, coverage tooling and HTML snapshot, this file |
| `feat/sqrt-percent` | `sqrt` with `math/big`, iOS-style `%`, the `result_too_long` limit, and their tests in every layer |
