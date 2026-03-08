import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['./vitest.node.config.mts', './vitest.browser.config.mts'],
  },
})
