-- El RPC anterior usaba current_date/localtime del servidor (UTC), lo que causaba
-- que distribuciones hechas después de las 21:00 Argentina (UTC-3) quedaran
-- guardadas con la fecha del día siguiente. Ahora el frontend envía la fecha/hora
-- local del dispositivo mediante p_fecha y p_hora.

DROP FUNCTION IF EXISTS public.registrar_distribucion_qr(uuid, jsonb, boolean, character varying, text);

CREATE OR REPLACE FUNCTION public.registrar_distribucion_qr(
  p_codigo_qr     uuid,
  p_items         jsonb,
  p_fecha         date                     DEFAULT NULL,
  p_hora          time                     DEFAULT NULL,
  p_sincronizado  boolean                  DEFAULT true,
  p_origen        character varying        DEFAULT 'online',
  p_observaciones text                     DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_alumno_id       bigint;
  v_docente_id      bigint;
  v_distribucion_id bigint;
  v_item            jsonb;
  v_id_producto     bigint;
  v_cantidad        integer;
begin
  if not public.has_any_role(array['administrador', 'docente']) then
    raise exception 'No tienes permisos para registrar distribuciones.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Debes enviar al menos un producto para la distribucion.';
  end if;

  select a.id
  into v_alumno_id
  from public.alumnos a
  where a.codigo_qr = p_codigo_qr
    and a.activo = true
  limit 1;

  if v_alumno_id is null then
    raise exception 'No existe un alumno activo con el codigo QR indicado.';
  end if;

  v_docente_id := public.current_profile_id();

  if v_docente_id is null then
    raise exception 'No se encontro el perfil del usuario autenticado.';
  end if;

  insert into public.distribuciones (
    id_alumno,
    id_docente,
    fecha,
    hora,
    sincronizado,
    origen,
    observaciones
  )
  values (
    v_alumno_id,
    v_docente_id,
    coalesce(p_fecha, current_date),
    coalesce(p_hora, localtime),
    coalesce(p_sincronizado, true),
    case
      when p_origen in ('online', 'offline', 'sincronizado') then p_origen
      else 'online'
    end,
    p_observaciones
  )
  returning id into v_distribucion_id;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    v_id_producto := nullif(v_item->>'id_producto', '')::bigint;
    v_cantidad    := coalesce(nullif(v_item->>'cantidad', '')::integer, 1);

    if v_id_producto is null then
      raise exception 'Cada item debe incluir un id_producto valido.';
    end if;

    if v_cantidad <= 0 then
      raise exception 'La cantidad distribuida debe ser mayor a cero.';
    end if;

    if not exists (
      select 1 from public.productos p where p.id = v_id_producto
    ) then
      raise exception 'El producto % no existe.', v_id_producto;
    end if;

    insert into public.detalle_distribuciones (
      id_distribucion,
      id_producto,
      cantidad
    )
    values (
      v_distribucion_id,
      v_id_producto,
      v_cantidad
    )
    on conflict (id_distribucion, id_producto)
    do update
    set cantidad = public.detalle_distribuciones.cantidad + excluded.cantidad;
  end loop;

  return v_distribucion_id;
end;
$$;

GRANT ALL ON FUNCTION public.registrar_distribucion_qr(uuid, jsonb, date, time, boolean, character varying, text) TO anon;
GRANT ALL ON FUNCTION public.registrar_distribucion_qr(uuid, jsonb, date, time, boolean, character varying, text) TO authenticated;
GRANT ALL ON FUNCTION public.registrar_distribucion_qr(uuid, jsonb, date, time, boolean, character varying, text) TO service_role;
