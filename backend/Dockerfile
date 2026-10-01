# syntax=docker/dockerfile:1

# ---- build stage ----
FROM golang:1.23-alpine AS build
WORKDIR /src

# Copy the module files first so the dependency layer is cached
# until go.mod or go.sum change.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

# ---- runtime stage ----
FROM alpine:3.22

RUN adduser -S -D -H -u 10001 app
COPY --from=build /out/server /usr/local/bin/server

ENV PORT=8080
EXPOSE 8080
USER app

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/healthz" || exit 1

# Exec form so SIGTERM reaches the server and triggers its graceful shutdown.
ENTRYPOINT ["/usr/local/bin/server"]
