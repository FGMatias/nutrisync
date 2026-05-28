-- planes_distribucion tiene RLS habilitado pero sin políticas → bloquea todo.
CREATE POLICY "planes_select" ON public.planes_distribucion
  FOR SELECT TO authenticated
  USING (public.has_any_role(ARRAY['administrador','director','cae','almacen']));

CREATE POLICY "planes_insert" ON public.planes_distribucion
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['administrador','cae']));

CREATE POLICY "planes_update" ON public.planes_distribucion
  FOR UPDATE TO authenticated
  USING (public.has_any_role(ARRAY['administrador','cae']))
  WITH CHECK (public.has_any_role(ARRAY['administrador','cae']));

CREATE POLICY "planes_delete" ON public.planes_distribucion
  FOR DELETE TO authenticated
  USING (public.has_any_role(ARRAY['administrador','cae']));
