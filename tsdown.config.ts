import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    platform: 'neutral',
    dts: {
      tsconfig: 'tsconfig.lib.json',
    },
    define: {
      __DEV__: 'process.env.NODE_ENV !== "production"',
    },
  },
])
