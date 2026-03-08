import { configDefaults, defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { join } from 'node:path'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  optimizeDeps: {
    include: ['@testing-library/jest-dom/vitest'],
  },
  test: {
    name: 'browser',
    exclude: configDefaults.exclude,
    include: ['**/*.browser.test.ts', '**/*.browser.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
    browser: {
      enabled: true,
      headless: true,
      expect: {
        toMatchScreenshot: {
          resolveScreenshotPath: ({ root, testFileDirectory, testFileName, arg, browserName, ext }) =>
            join(root, testFileDirectory, '__screenshots__', testFileName, `${arg}-${browserName}${ext}`),
          resolveDiffPath: ({ root, attachmentsDir, testFileDirectory, testFileName, arg, browserName, ext }) =>
            join(root, attachmentsDir, testFileDirectory, testFileName, `${arg}-${browserName}${ext}`),
        },
      },
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
})
