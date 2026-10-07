import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // supabase/functions es código Deno (otro runtime y otras reglas): no se
  // revisa con la configuración del frontend.
  { ignores: ["dist", "supabase/functions"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // date.toISOString().split('T')[0] sobre un Date de medianoche local (el
    // Calendar de shadcn/react-day-picker) desplaza la fecha un día hacia
    // atrás con cualquier offset UTC positivo (España) — ver auditoría de
    // fechas y src/lib/dateOnly.ts. Usar siempre toDateOnlyString(date).
    // ImportExport.tsx queda fuera: su uso parte de fechas ya en UTC
    // (ExcelJS/CSV), es un caso distinto que no se ha tocado en este arreglo.
    // Los .test.ts(x) quedan fuera porque comparan a propósito contra el
    // patrón viejo para demostrar que estaba roto (ver dateOnly.test.ts).
    files: ["**/*.{ts,tsx}"],
    ignores: ["src/components/investments/ImportExport.tsx", "**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name='split'][callee.object.type='CallExpression'][callee.object.callee.property.name='toISOString']",
          message:
            "No uses date.toISOString().split('T')[0] para obtener 'YYYY-MM-DD': desplaza un día hacia atrás en zonas con offset UTC positivo (España). Usa toDateOnlyString(date) de '@/lib/dateOnly'.",
        },
      ],
    },
  },
);
