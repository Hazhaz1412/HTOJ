FROM docker.io/library/golang:1.25.5-bookworm
WORKDIR /app

# Install PostgreSQL client for pg_isready and other tools
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

COPY ./go.mod .
COPY ./go.sum .
RUN go mod download

RUN curl -sLO https://github.com/tailwindlabs/tailwindcss/releases/download/v4.1.17/tailwindcss-linux-x64
RUN chmod +x ./tailwindcss-linux-x64

ENTRYPOINT [ "go", "tool", "air" ]

