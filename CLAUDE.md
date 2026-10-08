# CrowdFolio: instrucciones para Claude

App para que inversores españoles controlen su cartera de crowdfunding/crowdlending
inmobiliario y saquen el informe fiscal del IRPF. Único fundador: Dani (hablarle en
español, directo y sin jerga innecesaria; él aprueba, Claude implementa).

## Referencias

| Qué | Dónde |
|---|---|
| Código | GitHub `06danisanchez-lang/crowdfolio` (rama `main` = producción) |
| Web | crowdfolio.es (Vercel, proyecto `crowdfolio`) |
| Base de datos, auth, Edge Functions | Supabase, proyecto `eazwouasdrcbucxwjfxy` (plan gratuito) |
| Copia local de Dani | `~/Documents/CrowdFolio` en su Mac |

Stack: React 18 + Vite + TypeScript + Tailwind + shadcn/ui, TanStack Query, Zod,
Supabase (Postgres + RLS + Edge Functions), Stripe (pendiente de activar).

## Cómo se trabaja

1. **Una rama por cambio**, creada desde `main` actualizado. Nunca push directo a `main`.
2. **El código se edita en la copia de la nube** (clonar con `add_repo` con acceso
   `push`), no en la carpeta del Mac: allí git necesita permiso de borrado y cada
   comando es más lento.
3. **PR en español** que explique qué cambia *para el usuario* y cómo se ha probado.
   El CI (`.github/workflows/ci.yml`) tiene que estar en verde: tipos, lint, tests,
   build y base de datos de pruebas.
4. **Dani da el OK** antes de fusionar. Sin OK explícito no se fusiona.
5. Tras fusionar: Vercel publica solo; las Edge Functions que cambian se despliegan
   solas (`deploy-functions.yml`). Comprobar la web en producción.
6. **Poner al día la copia del Mac** cuando haya cambios en `main`:
   `git checkout main && git pull --ff-only` en `~/Documents/CrowdFolio` (pide antes
   permiso de borrado de esa carpeta, git lo necesita para sus `.lock`). Si hay
   cambios sin guardar en el Mac, preguntar antes de tocar nada.

## Base de datos: reglas

Producción es la única base real. Por eso:

- **Lecturas (`select`) en producción: libres.** Ojo, contienen datos de usuarios reales:
  no copiarlos fuera ni mostrarlos más allá de lo necesario.
- **Cualquier cambio de estructura o permisos** (tablas, columnas, políticas RLS,
  funciones, triggers) va así, sin excepciones:
  1. Migración nueva en `supabase/migrations/` con la fecha y hora actuales en el
     nombre (`AAAAMMDDHHMMSS_descripcion.sql`).
  2. `scripts/db-test.sh` en verde. Si toca permisos, añadir o ampliar una prueba en
     `supabase/tests/db/` que falle sin el cambio.
  3. PR fusionado con el OK de Dani.
  4. Aplicar en producción con la herramienta `apply_migration` de Supabase (deja la
     versión registrada). Si la migración borra algo (`drop`, `delete`…), Supabase pide
     una confirmación que desde la sesión en la nube no llega y se cancela sola. En ese
     caso, pasar a Dani el SQL para pegarlo en el SQL Editor, con un `insert into
     supabase_migrations.schema_migrations (version, name, statements)` usando la misma
     versión del archivo para que quede registrada. Después, comprobar el resultado en
     producción. Nunca `supabase db push`, nunca SQL que no salga de una migración del repo.
  5. Regenerar la instantánea (abajo) en un PR pequeño.
- **Cambios de datos en producción** (`update`/`delete`/`insert` a mano): solo con OK de
  Dani para esa operación concreta, y antes copiar las filas afectadas a una tabla
  `_backup_AAAAMMDD_<tabla>`. El plan gratuito no permite recuperar copias de seguridad.

### Base de datos de pruebas

`scripts/db-test.sh` levanta un Postgres desechable con la **estructura** de producción
(sin datos), aplica encima las migraciones posteriores a la instantánea y ejecuta las
pruebas de `supabase/tests/db/`. Tarda un par de segundos y lo ejecuta también el CI.

- `supabase/schema/prod_schema.sql`: instantánea de producción. No editar a mano.
- `supabase/schema/stubs.sql`: roles, `auth.users` y `auth.uid()` de Supabase simulados.
  Las pruebas actúan como un usuario con `tests.login(uuid)` o como anónimo con
  `tests.login_anon()`, y comprueban con `tests.check(...)` / `tests.must_fail(...)`.
- No prueba la web ni las Edge Functions: solo migraciones y permisos.

**Regenerar la instantánea** (después de aplicar una migración en producción): ejecutar
`supabase/schema/dump_schema.sql` contra producción con `execute_sql`, escribir las
filas en orden separadas por una línea en blanco, actualizar la cabecera
(`snapshot_version` = hora UTC actual `AAAAMMDDHHMMSS`, última migración, md5) y
comprobar que el md5 coincide calculándolo en producción con
`md5(string_agg(regexp_replace(ddl, '\s+', ' ', 'g'), '|' order by ord, k))`.

## Pruebas manuales

- **Nunca con la cuenta de Dani** (`06danisanchez@gmail.com`): es admin y ve cosas
  que un usuario normal no ve. Sus datos son de prueba, pero los de su padre son reales
  y no se tocan.
- Cuentas de prueba (los correos llegan al Gmail de Dani):
  - `06danisanchez+test@gmail.com`: gratuita, sin Pro. Para probar límites del plan
    gratuito y el código `CROWDFOUNDER`.
  - `06danisanchez+test2@gmail.com`: con Pro de beta.
- Las previews de Vercel usan la base de datos de producción: lo que se cree en una
  preview existe de verdad. Marcar los datos de prueba con `TEST` y borrarlos al acabar.

## Reglas del dominio (no negociables)

- La corrección fiscal es lo primero: un error en el informe invalida el documento entero.
- `amount` siempre está en EUR. En inversiones extranjeras, `amount` = `amount_eur`; las
  columnas de divisa son solo para auditoría.
- Pro = (plan activo de Stripe) **o** (`is_beta_pro` y `pro_until > now()`), ambos en
  `subscriptions`. `plan = 'free'` en un beta Pro es intencionado.
- El cálculo fiscal real está en el cliente (`useTaxSummary.ts`, `src/lib/tax/`). La Edge
  Function `calculate-tax` es código muerto (usa tablas que ya no existen).
- Toda consulta del cliente sobre datos del usuario filtra por `user_id` aunque RLS ya
  lo haga: un admin tiene políticas que le dejan leer todo (ver PR #26).
- Mantenerlo simple: no construir problemas que todavía no existen.
