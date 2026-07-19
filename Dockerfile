FROM rust:1.93-bookworm AS workspace
WORKDIR /workspace
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl nodejs npm \
 && rm -rf /var/lib/apt/lists/*
COPY Cargo.toml Cargo.lock ./
COPY rust/ rust/
COPY site/package.json site/package-lock.json site/
RUN npm --prefix site ci --ignore-scripts
COPY . .
RUN cargo fmt --all -- --check \
 && cargo test --workspace --locked \
 && npm --prefix site run check \
 && npm --prefix site run check:content \
 && npm --prefix site run check:parity \
 && npm --prefix site run build

FROM nginx:1.27-alpine AS site
COPY --from=workspace /workspace/site/dist/ /usr/share/nginx/html/

