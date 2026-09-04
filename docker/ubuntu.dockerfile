FROM aminya/setup-cpp-ubuntu-gcc:20.04 AS base

FROM base AS builder
WORKDIR /app
COPY ./ ./

# build
RUN npm i -g pnpm@10.8.0 && \
    pnpm install && \
    pnpm run build

FROM node:22-bookworm
WORKDIR /app

COPY ./ ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules

