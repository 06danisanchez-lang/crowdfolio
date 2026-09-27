import { defineConfig } from 'vitest/config';
import path from 'path';

// Fija la zona horaria de los tests a Europe/Madrid (offset positivo, con DST):
// es la zona real de los usuarios y la que reproduce el fallo de
// toISOString() sobre medianoche local que motivó dateOnly.ts. Debe fijarse
// antes de que Node inicialice sus internals de fecha/Intl.
process.env.TZ = 'Europe/Madrid';

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
