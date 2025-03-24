FROM aminya/setup-cpp-alpine-gcc:3.21-1.4.0-amd64 AS builder

WORKDIR /app
COPY ./ ./
ENV VCPKG_FORCE_SYSTEM_BINARIES=1
RUN \
    # system dependencies
    apk add --no-cache \
    automake \
    autoconf \
    libtool && \
    # build
    npm i -g pnpm && \
    pnpm install && \
    pnpm run build

FROM node:alpine3.21
WORKDIR /app

COPY ./ ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules


