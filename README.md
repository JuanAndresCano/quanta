# Calculator

A full-stack calculator: a React + TypeScript frontend that consumes a Go REST API.

> **Status:** work in progress. This README grows with each feature branch; sections marked _TBD_ are filled in as the corresponding feature lands.

## Scope

| Operation | Priority |
|---|---|
| Addition, subtraction, multiplication, division | Required |
| Exponentiation, square root, percentage | Optional (designed for, built if time allows) |

## Repository layout

```
.
├── backend/     # Go REST API (Gin), independently buildable and runnable
├── frontend/    # React + TypeScript (Vite), independently buildable and runnable
├── README.md
└── PROMPTS.md   # AI prompts used while building this project
```

Each side has its own `Dockerfile`, so the frontend and the backend can be built and run separately or together.

## Tech stack

- **Backend:** Go, Gin, `shopspring/decimal` for exact decimal arithmetic
- **Frontend:** React, TypeScript, Vite, Vitest + Testing Library
- **Packaging:** Docker (one image per side, plus a compose file to run both)

## Getting started

_TBD_ — setup, running the backend, running the frontend, and running with Docker.

## API

_TBD_ — full endpoint reference and `curl` examples. Planned contract:

```
POST /api/v1/add      {"a": "0.1", "b": "0.2"}  ->  200 {"result": "0.3"}
POST /api/v1/sqrt     {"value": "9"}            ->  200 {"result": "3"}   (optional)
POST /api/v1/divide   {"a": "1", "b": "0"}      ->  422 {"error": {"code": "division_by_zero", "message": "..."}}
```

Malformed requests (invalid JSON, missing or non-numeric operands) return `400`; valid requests that are mathematically impossible (e.g. division by zero) return `422`.

## Testing and coverage

_TBD_ — how to run the tests and produce coverage reports for both layers.

## Design decisions

_TBD_ — to be written as decisions land. Decisions taken so far:

- **Monorepo, independent deployables.** `backend/` and `frontend/` share nothing but the HTTP contract.
- **Exact decimal arithmetic.** Numbers travel as JSON strings and are computed with decimals, so `0.1 + 0.2` is exactly `0.3`.
- **Domain separated from transport.** The calculation logic knows nothing about HTTP or Gin; the API layer only translates requests into domain calls and domain errors into HTTP responses.
- **One endpoint per operation.** `POST /api/v1/add`, `/subtract`, `/multiply`, `/divide` (and later `/power`, `/sqrt`, `/percentage`). The URL states the intent, each operation has its own typed body (`{a, b}` for binary operations, `{value}` for unary ones), and unknown operations are a plain `404`. A calculator has no real resources, so this is RPC over HTTP either way; per-operation routes keep the contract explicit instead of hiding a `switch` behind a single `/calculate` endpoint.
- **`POST` with a JSON body, not `GET`.** Operands are decimal strings, which are cleaner in a body than in a query string.
- **Thin, explicit routing.** The domain exposes pure functions in two shapes (binary and unary). The router maps each route to one of two generic handlers, so adding an operation is one domain function plus one route line.

## Workflow

Nothing goes straight to `main`. Every change lives in a `feat/*` branch with a single, explicit mission. A branch is ready for a pull request when its mission's "done" criteria are met.
