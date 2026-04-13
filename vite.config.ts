import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'node:path'

const alias = {
  '@': path.resolve(__dirname, './src'),
}

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    maxWorkers: 1,
    minWorkers: 1,
    projects: [
      {
        test: {
          include: ['src/http/controllers/**/*.spec.ts'],
          environment: './prisma/vitest-environment-prisma/prisma-test-environment.ts',
        },
        resolve: { alias },
      },
      {
        test: {
          include: ['src/**/*.spec.ts', '!src/http/controllers/**/*.spec.ts'],
          environment: 'node',
        },
        resolve: { alias },
      },
    ],
  },
  resolve: {
    alias,
  },
})

// ✓  1  src/use-cases
// ✓  0  src/http/controllers
