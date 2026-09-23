import { defineConfig } from 'vitest/config';

// Configuración mínima — solo para los tests de lógica pura de src/lib/tax/.
// Sin entorno DOM ni alias: los tests usan imports relativos a propósito.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
