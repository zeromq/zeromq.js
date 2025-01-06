if (process.env.CI) {
  // exit after 1 second in CI environment
  setTimeout(() => {
    process.exit(0)
  }, 1000)
}

/* eslint-disable import/no-unassigned-import */
import "./producer"
import "./worker"
