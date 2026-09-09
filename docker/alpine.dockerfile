FROM aminya/setup-cpp-alpine-gcc:3.21 AS base

# Enable logging style for GitHub Actions
ENV CI=1 \
 GITHUB_ACTIONS=1

# system dependencies
RUN apk add --no-cache \
    curl \
    # bison for websockets
    bison \
    # newer cmake
    && curl -fsSL \
      "https://dl-cdn.alpinelinux.org/alpine/edge/main/$(apk --print-arch)/cmake-4.3.4-r0.apk" \
      -o /tmp/cmake-4.3.4-r0.apk \
    && apk add --no-cache /tmp/cmake-4.3.4-r0.apk \
    && rm -f /tmp/cmake-4.3.4-r0.apk && \
    # pnpm
    npm i -g pnpm@10.8.0 && \
    # cleanup
    rm -rf /var/cache/apk/*

FROM base AS builder
ENV VCPKG_FORCE_SYSTEM_BINARIES=1
WORKDIR /app
COPY ./ ./

# build
RUN source ~/.cpprc && \
    pnpm install && \
    pnpm run build

FROM node:alpine3.21
WORKDIR /app

COPY ./ ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
