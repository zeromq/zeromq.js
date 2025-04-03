FROM aminya/setup-cpp-ubuntu-gcc:20.04 AS base

# system dependencies
RUN apt-get update -q -y \
    && apt-get install --no-install-recommends -y \
    automake \
    autoconf \
    libtool && \
    apt-get clean autoclean && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/*

FROM base AS builder
WORKDIR /app
COPY ./ ./

# build
RUN npm i -g pnpm && \
    pnpm install && \
    pnpm run build

FROM node:22-bookworm
WORKDIR /app

COPY ./ ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules


