FROM aminya/setup-cpp-ubuntu-gcc:20.04 AS base

# Enable logging style for GitHub Actions
ENV CI=1 \
 GITHUB_ACTIONS=1

RUN apt-get update -q -y && \
    # bison for websockets
    apt-get install --no-install-recommends -y \
      bison && \
    # newer gcc
    setup-cpp --compiler gcc-16 && \
    # pnpm
    npm i -g pnpm@^10 && \
    # cleanup
    apt-get clean autoclean && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/*

FROM base AS builder
WORKDIR /app
COPY ./ ./

# build
RUN source ~/.cpprc && \
    pnpm install && \
    pnpm run build

FROM node:22-bookworm
WORKDIR /app

COPY ./ ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules

