-- Avisos de seguridad del asesor de Supabase (08/10/2026).
--
-- 1) handle_new_user y handle_new_user_subscription son funciones de trigger
--    (SECURITY DEFINER) que se podían llamar por la API (/rest/v1/rpc/...) como
--    anónimo o usuario. Llamarlas a mano falla, pero no deben estar expuestas.
--    Los triggers de alta siguen funcionando: el permiso EXECUTE no se comprueba
--    al dispararse un trigger.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_user_subscription() from public, anon, authenticated;

-- 2) update_updated_at_column no fijaba search_path.
alter function public.update_updated_at_column() set search_path = '';

-- has_role sigue ejecutable por authenticated a propósito: las políticas RLS de
-- admin la llaman con los permisos del usuario que consulta.
