-- Notificaciones duplicadas.
--
-- El generador de notificaciones (useNotificationGenerator) decide si un aviso
-- ya existe mirando la lista que tiene en memoria. Si se ejecuta dos veces
-- antes de recargarla (varias pestañas o dispositivos, o un refresco de datos
-- en medio), inserta el mismo aviso varias veces. En producción había avisos
-- de cobro, de vencimiento y resúmenes semanales repetidos en tres cuentas, y
-- pulsar «Sí, cobrado» en cada copia registraba el mismo cobro varias veces.
--
-- Cada aviso lleva ahora una clave (p. ej. 'payment_due:<inversión>:<fecha>')
-- y la base de datos no admite dos con la misma clave para el mismo usuario.
-- La app inserta con ON CONFLICT DO NOTHING. Los avisos antiguos no tienen
-- clave (NULL) y no se ven afectados: NULL nunca choca con NULL.
alter table public.notifications add column if not exists dedupe_key text;

create unique index if not exists notifications_user_dedupe_key
  on public.notifications (user_id, dedupe_key);
