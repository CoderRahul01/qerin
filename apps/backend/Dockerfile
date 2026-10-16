# Stage 1: Build the Rust application
FROM rust:1.85-slim-bookworm AS builder

WORKDIR /usr/src/qerin-backend

# Install build dependencies including OpenSSL and pkg-config
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests
COPY Cargo.toml Cargo.lock ./

# Cache dependencies with dummy source
RUN mkdir src && echo "fn main() {}" > src/main.rs && echo "" > src/lib.rs
RUN cargo build --release || true
RUN rm -rf src

# Copy real source code and test files
COPY src ./src
COPY tests ./tests

# Build production release binary
RUN touch src/main.rs src/lib.rs && cargo build --release

# Stage 2: Minimal runtime image
FROM debian:bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled binary from builder
COPY --from=builder /usr/src/qerin-backend/target/release/qerin-backend-rs /app/qerin-backend-rs

ENV PORT=8787
EXPOSE 8787

CMD ["/app/qerin-backend-rs"]
