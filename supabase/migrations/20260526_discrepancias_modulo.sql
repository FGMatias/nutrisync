-- Modulo de discrepancias: estados, evidencias y flujo de stock

alter table public.discrepancias
  add column if not exists estado varchar(20) not null default 'registrada',
  add column if not exists evidencias jsonb not null default '[]'::jsonb,
  add column if not exists creado_por bigint null,
  add column if not exists actualizado_en timestamptz not null default now(),
  add column if not exists motivo_resolucion text,
  add column if not exists resuelta_en timestamptz,
  add column if not exists resuelta_por bigint null,
  add column if not exists motivo_anulacion text,
  add column if not exists anulada_en timestamptz,
  add column if not exists anulada_por bigint null;

alter table public.discrepancias
  drop constraint if exists discrepancias_estado_check;

alter table public.discrepancias
  add constraint discrepancias_estado_check
  check (estado in ('registrada', 'resuelta', 'anulada'));

alter table public.discrepancias
  drop constraint if exists discrepancias_creado_por_fkey;
alter table public.discrepancias
  add constraint discrepancias_creado_por_fkey
  foreign key (creado_por) references public.perfiles(id) on delete set null;

alter table public.discrepancias
  drop constraint if exists discrepancias_resuelta_por_fkey;
alter table public.discrepancias
  add constraint discrepancias_resuelta_por_fkey
  foreign key (resuelta_por) references public.perfiles(id) on delete set null;

alter table public.discrepancias
  drop constraint if exists discrepancias_anulada_por_fkey;
alter table public.discrepancias
  add constraint discrepancias_anulada_por_fkey
  foreign key (anulada_por) references public.perfiles(id) on delete set null;

update public.discrepancias
set estado = coalesce(nullif(estado, ''), 'registrada')
where estado is null or estado = '';

create or replace function public.discrepancias_set_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create or replace function public.recalcular_estado_ingreso_por_discrepancias(p_id_ingreso bigint)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_estado_ingreso text;
  v_activas integer := 0;
begin
  if p_id_ingreso is null then
    return;
  end if;

  select estado::text
  into v_estado_ingreso
  from public.ingresos
  where id = p_id_ingreso;

  if v_estado_ingreso is null or v_estado_ingreso = 'anulado' then
    return;
  end if;

  select count(*)
  into v_activas
  from public.discrepancias d
  join public.detalle_ingresos di
    on di.id = d.id_detalle_ingreso
  where di.id_ingreso = p_id_ingreso
    and d.estado = 'registrada';

  update public.ingresos
  set estado = case when v_activas > 0 then 'con_discrepancia' else 'conforme' end
  where id = p_id_ingreso
    and estado <> 'anulado';
end;
$$;

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

  select d.id, d.cantidad_esperada
  into v_discrepancia_id, v_cantidad_esperada
  from public.discrepancias d
  where d.id_detalle_ingreso = p_id_detalle_ingreso;

  if v_cantidad_esperada is null then
    select di.cantidad
    into v_cantidad_esperada
    from public.detalle_ingresos di
    where di.id = p_id_detalle_ingreso;
  end if;

  insert into public.discrepancias (
    id_detalle_ingreso,
    cantidad_esperada,
    cantidad_recibida,
    observaciones,
    estado,
    evidencias,
    creado_por,
    motivo_resolucion,
    resuelta_en,
    resuelta_por,
    motivo_anulacion,
    anulada_en,
    anulada_por
  )
  values (
    p_id_detalle_ingreso,
    v_cantidad_esperada,
    p_cantidad_recibida,
    nullif(btrim(coalesce(p_observaciones, '')), ''),
    'registrada',
    coalesce(p_evidencias, '[]'::jsonb),
    v_perfil_id,
    null,
    null,
    null,
    null,
    null,
    null
  )
  on conflict (id_detalle_ingreso)
  do update
  set
    cantidad_esperada = excluded.cantidad_esperada,
    cantidad_recibida = excluded.cantidad_recibida,
    observaciones = excluded.observaciones,
    estado = 'registrada',
    evidencias = excluded.evidencias,
    motivo_resolucion = null,
    resuelta_en = null,
    resuelta_por = null,
    motivo_anulacion = null,
    anulada_en = null,
    anulada_por = null,
    actualizado_en = now()
  returning id into v_discrepancia_id;

  update public.detalle_ingresos
  set cantidad = p_cantidad_recibida
  where id = p_id_detalle_ingreso;

  perform public.recalcular_estado_ingreso_por_discrepancias(v_id_ingreso);

  return v_discrepancia_id;
end;
$$;

create or replace function public.resolver_discrepancia_ingreso(
  p_id_discrepancia bigint,
  p_cantidad_final integer default null,
  p_motivo text default null,
  p_evidencias jsonb default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id_detalle_ingreso bigint;
  v_id_ingreso bigint;
  v_estado text;
  v_cantidad_esperada integer;
  v_cantidad_final integer;
  v_perfil_id bigint;
begin
  if not public.has_any_role(array['administrador', 'almacen', 'cae']) then
    raise exception 'No tienes permisos para resolver discrepancias.';
  end if;

  if p_id_discrepancia is null or p_id_discrepancia <= 0 then
    raise exception 'Debes indicar una discrepancia valida.';
  end if;

  v_perfil_id := public.current_profile_id();

  select d.id_detalle_ingreso, d.estado::text, d.cantidad_esperada, di.id_ingreso
  into v_id_detalle_ingreso, v_estado, v_cantidad_esperada, v_id_ingreso
  from public.discrepancias d
  join public.detalle_ingresos di
    on di.id = d.id_detalle_ingreso
  where d.id = p_id_discrepancia;

  if v_id_detalle_ingreso is null then
    raise exception 'No existe la discrepancia seleccionada.';
  end if;

  if v_estado = 'anulada' then
    raise exception 'No puedes resolver una discrepancia anulada.';
  end if;

  v_cantidad_final := coalesce(p_cantidad_final, v_cantidad_esperada);

  if v_cantidad_final < 0 then
    raise exception 'La cantidad final no puede ser negativa.';
  end if;

  update public.discrepancias
  set
    estado = 'resuelta',
    cantidad_recibida = v_cantidad_final,
    motivo_resolucion = nullif(btrim(coalesce(p_motivo, '')), ''),
    resuelta_en = now(),
    resuelta_por = v_perfil_id,
    evidencias = case
      when p_evidencias is null then evidencias
      else coalesce(evidencias, '[]'::jsonb) || p_evidencias
    end,
    motivo_anulacion = null,
    anulada_en = null,
    anulada_por = null,
    actualizado_en = now()
  where id = p_id_discrepancia;

  update public.detalle_ingresos
  set cantidad = v_cantidad_final
  where id = v_id_detalle_ingreso;

  perform public.recalcular_estado_ingreso_por_discrepancias(v_id_ingreso);
end;
$$;

create or replace function public.anular_discrepancia_ingreso(
  p_id_discrepancia bigint,
  p_motivo text default null,
  p_evidencias jsonb default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id_detalle_ingreso bigint;
  v_id_ingreso bigint;
  v_cantidad_esperada integer;
  v_perfil_id bigint;
begin
  if not public.has_any_role(array['administrador', 'almacen', 'cae']) then
    raise exception 'No tienes permisos para anular discrepancias.';
  end if;

  if p_id_discrepancia is null or p_id_discrepancia <= 0 then
    raise exception 'Debes indicar una discrepancia valida.';
  end if;

  v_perfil_id := public.current_profile_id();

  select d.id_detalle_ingreso, d.cantidad_esperada, di.id_ingreso
  into v_id_detalle_ingreso, v_cantidad_esperada, v_id_ingreso
  from public.discrepancias d
  join public.detalle_ingresos di
    on di.id = d.id_detalle_ingreso
  where d.id = p_id_discrepancia;

  if v_id_detalle_ingreso is null then
    raise exception 'No existe la discrepancia seleccionada.';
  end if;

  update public.discrepancias
  set
    estado = 'anulada',
    cantidad_recibida = v_cantidad_esperada,
    motivo_anulacion = nullif(btrim(coalesce(p_motivo, '')), ''),
    anulada_en = now(),
    anulada_por = v_perfil_id,
    evidencias = case
      when p_evidencias is null then evidencias
      else coalesce(evidencias, '[]'::jsonb) || p_evidencias
    end,
    actualizado_en = now()
  where id = p_id_discrepancia;

  update public.detalle_ingresos
  set cantidad = v_cantidad_esperada
  where id = v_id_detalle_ingreso;

  perform public.recalcular_estado_ingreso_por_discrepancias(v_id_ingreso);
end;
$$;

drop trigger if exists trigger_discrepancias_set_actualizado_en on public.discrepancias;
create trigger trigger_discrepancias_set_actualizado_en
before update on public.discrepancias
for each row execute function public.discrepancias_set_actualizado_en();

grant execute on function public.recalcular_estado_ingreso_por_discrepancias(bigint) to authenticated, service_role;
grant execute on function public.registrar_discrepancia_ingreso(bigint, integer, text, jsonb) to authenticated, service_role;
grant execute on function public.resolver_discrepancia_ingreso(bigint, integer, text, jsonb) to authenticated, service_role;
grant execute on function public.anular_discrepancia_ingreso(bigint, text, jsonb) to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'discrepancias-evidencias',
  'discrepancias-evidencias',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "discrepancias_evidencias_select" on storage.objects;
drop policy if exists "discrepancias_evidencias_insert" on storage.objects;
drop policy if exists "discrepancias_evidencias_update" on storage.objects;
drop policy if exists "discrepancias_evidencias_delete" on storage.objects;

create policy "discrepancias_evidencias_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'discrepancias-evidencias'
  and exists (
    select 1
    from public.perfiles p
    where p.id_usuario_auth = auth.uid()
      and p.rol in ('administrador', 'director', 'cae', 'almacen')
  )
);

create policy "discrepancias_evidencias_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'discrepancias-evidencias'
  and exists (
    select 1
    from public.perfiles p
    where p.id_usuario_auth = auth.uid()
      and p.rol in ('administrador', 'cae', 'almacen')
  )
);

create policy "discrepancias_evidencias_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'discrepancias-evidencias'
  and exists (
    select 1
    from public.perfiles p
    where p.id_usuario_auth = auth.uid()
      and p.rol in ('administrador', 'cae', 'almacen')
  )
)
with check (
  bucket_id = 'discrepancias-evidencias'
  and exists (
    select 1
    from public.perfiles p
    where p.id_usuario_auth = auth.uid()
      and p.rol in ('administrador', 'cae', 'almacen')
  )
);

create policy "discrepancias_evidencias_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'discrepancias-evidencias'
  and exists (
    select 1
    from public.perfiles p
    where p.id_usuario_auth = auth.uid()
      and p.rol in ('administrador', 'cae', 'almacen')
  )
);
