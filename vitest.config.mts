import {defineConfig} from "vitest/config"

export default defineConfig({
  test: {
    include: ["test/unit/**/*-test.{ts,js}"],
    watch: false,
    globals: true,
    passWithNoTests: true,
    poolOptions: {
      forks: {
        execArgv: ["--expose-gc"],
      },
    },
    // retry: 3,
  },
})
