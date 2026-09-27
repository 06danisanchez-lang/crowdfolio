import { defineConfig } from 'vitest/config';
import path from 'path';

// Los tests de lógica pura (.test.ts, en src/lib/) siguen sin entorno DOM ni
// alias, a propósito: rápidos, con imports relativos. Los tests de
// componentes (.test.tsx) sí necesitan jsdom y el alias @/ (igual que
// vite.config.ts) para poder montar componentes reales con React Testing
// Library — se añadieron en el hotfix de DefaultLossQuestionnaire.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environmentMatchGlobs: [['**/*.test.tsx', 'jsdom']],
  },
});
