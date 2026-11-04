-- El usuario solo puede editar de su perfil lo que la web le deja editar.
--
-- Hasta ahora la política «Users can update own profile» dejaba cambiar cualquier
-- columna de la propia fila, también stripe_customer_id y email. Las funciones de
-- Stripe (check-subscription, customer-portal, create-checkout) se fían de
-- stripe_customer_id: quien pusiera ahí el id de cliente de otra persona podría
-- abrir su portal de facturación o figurar como Pro con su suscripción.
--
-- Con permisos por columna, la web sigue pudiendo cambiar nombre, avatar y el
-- aviso de bienvenida Pro. stripe_customer_id y email solo los escriben el
-- webhook y las funciones con service_role, y el alta (trigger SECURITY DEFINER).
revoke update on public.profiles from anon, authenticated;
grant update (full_name, avatar_url, pro_welcome_shown, updated_at) on public.profiles to authenticated;
