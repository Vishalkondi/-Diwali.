import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

try {
  process.loadEnvFile(resolve(import.meta.dirname, '../../.env'));
} catch {
  // CI provides the environment directly
}

// Set before anything imports src/env.ts, so the global setup and every worker agree.
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ?? 'postgres://diyadash:diyadash@localhost:5434/diyadash_test',
  JWT_SECRET: process.env.JWT_SECRET ?? 'test-secret-test-secret-test-secret-123',
  // Fast clock: the whole journey takes 1.5 s.
  FULFIL_PLACED_SECONDS: '0.4',
  FULFIL_PACKING_SECONDS: '0.4',
  FULFIL_ON_THE_WAY_SECONDS: '0.7',
  STREAM_TICK_MS: '150',
});

export default defineConfig({
  test: {
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup.ts'],
    // One shared database: run files one after another.
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
