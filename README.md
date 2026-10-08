# Crowdfolio

Aplicación web para que inversores españoles controlen su cartera de crowdfunding y
crowdlending inmobiliario (Urbanitae, Housers, Wecity, Civislend, Mintos…): inversiones,
cobros, vencimientos, impagos y el informe fiscal del IRPF en PDF y Excel.

En producción en **https://www.crowdfolio.es**.

> Las reglas de trabajo (ramas, PR, base de datos, pruebas) están en [`CLAUDE.md`](CLAUDE.md).

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form + Zod |
| Backend | Supabase (Postgres con RLS, Auth, Edge Functions), proyecto `eazwouasdrcbucxwjfxy` |
| Pagos | Stripe (desactivado: `PAYMENTS_ENABLED` en `src/lib/stripe/config.ts`) |
| Hosting | Vercel, proyecto `crowdfolio` |

## Estructura

```
src/
├── components/          # Por dominio: investments, payments, tax, dashboard, future-investments,
│                        # admin, subscription, settings, landing, layout, ui (shadcn)…
├── contexts/            # AuthContext, SubscriptionContext…
├── hooks/               # useInvestments, useTaxSummary, useNotifications…
├── lib/
│   ├── tax/             # Motor fiscal: bases, retenciones, impagos (art. 14.2.k), gastos
│   ├── investment/      # Cálculos de inversión, cierre de equity, importación
│   └── dateOnly.ts      # Fechas 'YYYY-MM-DD' sin desplazamientos de zona horaria
├── pages/               # Rutas: /, /landing, /auth, /pricing, /admin-dashboard, legales
└── integrations/supabase/  # Cliente y tipos generados
supabase/
├── functions/           # Edge Functions (se despliegan solas al fusionar en main)
├── migrations/          # Cambios de esquema versionados
├── schema/              # Instantánea de producción para la base de datos de pruebas
└── tests/db/            # Pruebas de permisos (RLS)
scripts/db-test.sh       # Base de datos de pruebas desechable
```

## Desarrollo local

```bash
npm install
# crea .env con las variables de abajo
npm run dev            # http://localhost:5173
```

Variables del frontend (todas públicas):

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://eazwouasdrcbucxwjfxy.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública (anon) del proyecto |
| `VITE_SUPABASE_PROJECT_ID` | `eazwouasdrcbucxwjfxy` |

Los secretos (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`)
viven en Supabase y solo los usan las Edge Functions.

## Comprobaciones

```bash
npx tsc -p tsconfig.app.json --noEmit   # tipos
npm run lint
npm test                                # vitest
npm run build
scripts/db-test.sh                      # migraciones y permisos (necesita PostgreSQL)
```

El CI de GitHub ejecuta todo esto en cada PR.

## Edge Functions

| Función | Para qué |
|---------|----------|
| `apply-promo-code` | Canjea códigos promocionales (p. ej. `CROWDFOUNDER`) |
| `check-subscription` | Estado de la suscripción en Stripe |
| `create-checkout` | Abre el pago de Stripe |
| `customer-portal` | Portal de Stripe para gestionar la suscripción |
| `stripe-webhook` | Recibe los eventos de Stripe |
| `delete-user` | Borra un usuario desde el panel de admin |

## Panel de administración

Ruta `/admin-dashboard`, solo para usuarios con rol `admin` en la tabla `user_roles`
(comprobado con `has_role()`). El admin puede leer los datos de todos los usuarios, pero
no modificarlos.

## Licencia

Proyecto privado. Todos los derechos reservados.
