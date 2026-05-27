-- Permitir historial de discrepancias por mismo detalle de ingreso
-- (no sobrescribir discrepancias ya resueltas/anuladas)

alter table public.discrepancias
  drop constraint if exists discrepancias_id_detalle_ingreso_key;

create index if not exists idx_discrepancias_detalle_estado_creado
  on public.discrepancias (id_detalle_ingreso, estado, creado_en desc);

create or replace function public.registrar_discrepancia_ingreso(
  p_id_detalle_ingreso bigint,
  p_cantidad_recibida integer,
  p_observaciones text default null,
  p_evidencias jsonb default '[]'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_discrepancia_id bigint;
  v_id_ingreso bigint;
  v_cantidad_esperada integer;
  v_estado_ingreso text;
  v_perfil_id bigint;
begin
  if not public.has_any_role(array['administrador', 'almacen', 'cae']) then
    raise exception 'No tienes permisos para registrar discrepancias.';
  end if;

  if p_id_detalle_ingreso is null or p_id_detalle_ingreso <= 0 then
    raise exception 'Debes seleccionar un detalle de ingreso valido.';
  end if;

  if p_cantidad_recibida is null or p_cantidad_recibida < 0 then
    raise exception 'La cantidad recibida debe ser mayor o igual a cero.';
  end if;

  v_perfil_id := public.current_profile_id();

  select di.id_ingreso, di.cantidad, i.estado::text
  into v_id_ingreso, v_cantidad_esperada, v_estado_ingreso
  from public.detalle_ingresos di
  join public.ingresos i
    on i.id = di.id_ingreso
  where di.id = p_id_detalle_ingreso;

  if v_id_ingreso is null then
    raise exception 'No existe el detalle de ingreso seleccionado.';
  end if;

  if v_estado_ingreso = 'anulado' then
    raise exception 'No se puede registrar discrepancia en un ingreso anulado.';
  end if;

  if exists (
    select 1
    from public.discrepancias d
    where d.id_detalle_ingreso = p_id_detalle_ingreso
      and d.estado = 'registrada'
  ) then
    raise exception 'Ya existe una discrepancia activa para este producto/lote. Debes resolverla o anularla primero.';
  end if;

  insert into public.discrepancias (
    id_detalle_ingreso,
    cantidad_esperada,
    cantidad_recibida,
    observaciones,
    estado,
    evidencias,
    creado_por
  )
  values (
    p_id_detalle_ingreso,
    v_cantidad_esperada,
    p_cantidad_recibida,
    nullif(btrim(coalesce(p_observaciones, '')), ''),
    'registrada',
    coalesce(p_evidencias, '[]'::jsonb),
    v_perfil_id
  )
  returning id into v_discrepancia_id;

  -- El stock vigente refleja la ultima discrepancia activa
  update public.detalle_ingresos
  set cantidad = p_cantidad_recibida
  where id = p_id_detalle_ingreso;

  perform public.recalcular_estado_ingreso_por_discrepancias(v_id_ingreso);

  return v_discrepancia_id;
end;
$$;

grant execute on function public.registrar_discrepancia_ingreso(bigint, integer, text, jsonb)
  to authenticated, service_role;
