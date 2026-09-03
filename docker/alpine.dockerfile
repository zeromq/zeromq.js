FROM aminya/setup-cpp-alpine-gcc:3.21 AS base
# system dependencies
RUN apk add --no-cache \
    automake \
    autoconf \
    libtool

FROM base AS builder
WORKDIR /app
COPY ./ ./
# build
RUN npm i -g pnpm@12.3.0 && \
    pnpm install && \
    pnpm run build

FROM node:alpine3.21
WORKDIR /app

COPY ./ ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules

