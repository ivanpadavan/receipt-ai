// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig(
  {
    ignores: [
      '.next/*',
      'prisma/generated/*',
      'forms/*',
      'hooks/rx',
      'postcss.config.js',
      'next.config.js',
      'tailwind.config.js',
      'babel.config.js',
      'next-env.d.ts',
    ]
  },
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  ...nextVitals,
  {
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-unused-expressions': 'off',
    },
  },
);