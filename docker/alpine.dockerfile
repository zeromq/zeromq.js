FROM aminya/setup-cpp-alpine-gcc:3.21 AS base
# system dependencies
RUN apk add --no-cache \
    curl \
    && curl -fsSL \
      "https://dl-cdn.alpinelinux.org/alpine/edge/main/$(apk --print-arch)/cmake-4.3.4-r0.apk" \
      -o /tmp/cmake-4.3.4-r0.apk \
    && apk add --no-cache /tmp/cmake-4.3.4-r0.apk \
    && rm -f /tmp/cmake-4.3.4-r0.apk \
    && cmake --version

FROM base AS builder
ENV VCPKG_FORCE_SYSTEM_BINARIES=1
WORKDIR /app
COPY ./ ./
# build
RUN npm i -g pnpm@10.8.0 && \
    pnpm install && \
    pnpm run build

FROM node:alpine3.21
WORKDIR /app

COPY ./ ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
