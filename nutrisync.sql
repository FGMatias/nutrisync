


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."actualizar_diferencia_discrepancia"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.diferencia := coalesce(new.cantidad_recibida, 0) - coalesce(new.cantidad_esperada, 0);
  return new;
end;
$$;


ALTER FUNCTION "public"."actualizar_diferencia_discrepancia"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ajustar_stock_producto"("p_id_producto" bigint, "p_delta" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public.ajustar_stock_producto(
    p_id_producto,
    p_delta,
    'Ajuste rapido de stock'
  );
end;
$$;


ALTER FUNCTION "public"."ajustar_stock_producto"("p_id_producto" bigint, "p_delta" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ajustar_stock_producto"("p_id_producto" bigint, "p_delta" integer, "p_motivo" "text" DEFAULT 'Ajuste rapido de stock'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_stock_actual integer := 0;
begin
  if not public.has_any_role(array['administrador', 'almacen']) then
    raise exception 'No tienes permisos para ajustar stock.';
  end if;

  if p_delta is null or p_delta = 0 then
    return;
  end if;

  if not exists (
    select 1
    from public.productos
    where id = p_id_producto
  ) then
    raise exception 'El producto indicado no existe.';
  end if;

  perform public.recalcular_stock_producto(p_id_producto);

  select coalesce(cantidad_actual, 0)
  into v_stock_actual
  from public.stock
  where id_producto = p_id_producto;

  if v_stock_actual + p_delta < 0 then
    raise exception 'El stock no puede quedar negativo.';
  end if;

  insert into public.ajustes_stock (
    id_producto,
    id_usuario,
    tipo_ajuste,
    cantidad_delta,
    motivo
  )
  values (
    p_id_producto,
    public.current_profile_id(),
    'manual',
    p_delta,
    coalesce(nullif(btrim(p_motivo), ''), 'Ajuste rapido de stock')
  );
end;
$$;


ALTER FUNCTION "public"."ajustar_stock_producto"("p_id_producto" bigint, "p_delta" integer, "p_motivo" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."anular_discrepancia_ingreso"("p_id_discrepancia" bigint, "p_motivo" "text" DEFAULT NULL::"text", "p_evidencias" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."anular_discrepancia_ingreso"("p_id_discrepancia" bigint, "p_motivo" "text", "p_evidencias" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."crear_perfil_desde_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_role       text;
  v_default_role text;
BEGIN
  v_default_role := CASE
    WHEN EXISTS (SELECT 1 FROM public.perfiles) THEN 'almacen'
    ELSE 'administrador'
  END;

  v_role := lower(
    coalesce(nullif(new.raw_user_meta_data->>'rol', ''), v_default_role)
  );

  IF v_role NOT IN (
    'administrador', 'director', 'cae', 'almacen',
    'docente', 'operario_logistico', 'padre_familia'
  ) THEN
    v_role := v_default_role;
  END IF;

  INSERT INTO public.perfiles (
    id_usuario_auth,
    rol,
    nombre_completo,
    activo
  ) VALUES (
    new.id,
    v_role,
    coalesce(
      nullif(new.raw_user_meta_data->>'nombre_completo', ''),
      nullif(
        btrim(concat_ws(' ',
          new.raw_user_meta_data->>'nombres',
          new.raw_user_meta_data->>'apellidos'
        )),
        ''
      ),
      split_part(coalesce(new.email, 'usuario'), '@', 1)
    ),
    true
  )
  ON CONFLICT (id_usuario_auth) DO NOTHING;

  RETURN new;
END;
$$;


ALTER FUNCTION "public"."crear_perfil_desde_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."crear_stock_inicial_producto"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.stock (
    id_producto,
    cantidad_actual,
    actualizado_en
  )
  values (
    new.id,
    0,
    now()
  )
  on conflict (id_producto) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."crear_stock_inicial_producto"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."perfiles" (
    "id" bigint NOT NULL,
    "id_usuario_auth" "uuid" NOT NULL,
    "rol" character varying(40) DEFAULT 'almacen'::character varying NOT NULL,
    "nombre_completo" character varying(255) NOT NULL,
    "telefono" character varying(20),
    "dni" character varying(8),
    "id_alumno" bigint,
    "activo" boolean DEFAULT true NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "perfiles_dni_formato_check" CHECK ((("dni" IS NULL) OR (("dni")::"text" ~ '^\d{8}$'::"text"))),
    CONSTRAINT "perfiles_rol_check" CHECK ((("rol")::"text" = ANY ((ARRAY['administrador'::character varying, 'director'::character varying, 'cae'::character varying, 'almacen'::character varying, 'docente'::character varying, 'operario_logistico'::character varying, 'padre_familia'::character varying])::"text"[])))
);


ALTER TABLE "public"."perfiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."crear_usuario_completo"("p_email" "text", "p_nombre_completo" "text", "p_dni" "text" DEFAULT NULL::"text", "p_telefono" "text" DEFAULT NULL::"text", "p_rol" "text" DEFAULT 'almacen'::"text", "p_activo" boolean DEFAULT true, "p_id_alumno" bigint DEFAULT NULL::bigint) RETURNS "public"."perfiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_rol text;
  v_user_id    uuid;
  v_perfil     public.perfiles;
BEGIN
  SELECT rol INTO v_caller_rol
  FROM public.perfiles
  WHERE id_usuario_auth = auth.uid();

  IF v_caller_rol NOT IN ('administrador', 'director') THEN
    RAISE EXCEPTION 'Permiso denegado: solo administradores pueden crear usuarios';
  END IF;

  IF p_rol NOT IN (
    'administrador', 'director', 'cae', 'almacen',
    'docente', 'operario_logistico', 'padre_familia'
  ) THEN
    RAISE EXCEPTION 'Rol inválido: %', p_rol;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(trim(p_email))) THEN
    RAISE EXCEPTION 'Ya existe un usuario con el correo %', p_email;
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    lower(trim(p_email)),
    extensions.crypt('admin123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre_completo', p_nombre_completo, 'rol', p_rol),
    now(), now(),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    lower(trim(p_email)),
    jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(p_email))),
    'email',
    now(), now(), now()
  );

  -- El trigger crear_perfil_desde_auth ya insertó el perfil básico.
  -- Upsert para completar los datos (dni, telefono, rol, activo, id_alumno).
  INSERT INTO public.perfiles (
    id_usuario_auth,
    nombre_completo,
    dni,
    telefono,
    rol,
    activo,
    id_alumno
  ) VALUES (
    v_user_id,
    p_nombre_completo,
    nullif(trim(coalesce(p_dni, '')), ''),
    nullif(trim(coalesce(p_telefono, '')), ''),
    p_rol,
    p_activo,
    p_id_alumno
  )
  ON CONFLICT (id_usuario_auth) DO UPDATE SET
    nombre_completo = EXCLUDED.nombre_completo,
    dni             = EXCLUDED.dni,
    telefono        = EXCLUDED.telefono,
    rol             = EXCLUDED.rol,
    activo          = EXCLUDED.activo,
    id_alumno       = EXCLUDED.id_alumno
  RETURNING * INTO v_perfil;

  RETURN v_perfil;
END;
$$;


ALTER FUNCTION "public"."crear_usuario_completo"("p_email" "text", "p_nombre_completo" "text", "p_dni" "text", "p_telefono" "text", "p_rol" "text", "p_activo" boolean, "p_id_alumno" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_linked_student_id"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.id_alumno
  from public.perfiles p
  where p.id_usuario_auth = auth.uid()
    and p.activo = true
  limit 1
$$;


ALTER FUNCTION "public"."current_linked_student_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_profile_id"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.id
  from public.perfiles p
  where p.id_usuario_auth = auth.uid()
    and p.activo = true
  limit 1
$$;


ALTER FUNCTION "public"."current_profile_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.rol
  from public.perfiles p
  where p.id_usuario_auth = auth.uid()
    and p.activo = true
  limit 1
$$;


ALTER FUNCTION "public"."current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."discrepancias_set_actualizado_en"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."discrepancias_set_actualizado_en"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."establecer_stock_producto"("p_id_producto" bigint, "p_cantidad" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public.establecer_stock_producto(
    p_id_producto,
    p_cantidad,
    'Ajuste manual de stock'
  );
end;
$$;


ALTER FUNCTION "public"."establecer_stock_producto"("p_id_producto" bigint, "p_cantidad" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."establecer_stock_producto"("p_id_producto" bigint, "p_cantidad" integer, "p_motivo" "text" DEFAULT 'Ajuste manual de stock'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_stock_actual integer := 0;
  v_delta integer := 0;
begin
  if not public.has_any_role(array['administrador', 'almacen']) then
    raise exception 'No tienes permisos para establecer stock.';
  end if;

  if p_cantidad is null or p_cantidad < 0 then
    raise exception 'La cantidad no puede ser negativa.';
  end if;

  if not exists (
    select 1
    from public.productos
    where id = p_id_producto
  ) then
    raise exception 'El producto indicado no existe.';
  end if;

  perform public.recalcular_stock_producto(p_id_producto);

  select coalesce(cantidad_actual, 0)
  into v_stock_actual
  from public.stock
  where id_producto = p_id_producto;

  v_delta := p_cantidad - v_stock_actual;

  if v_delta = 0 then
    return;
  end if;

  insert into public.ajustes_stock (
    id_producto,
    id_usuario,
    tipo_ajuste,
    cantidad_delta,
    motivo
  )
  values (
    p_id_producto,
    public.current_profile_id(),
    'manual',
    v_delta,
    coalesce(nullif(btrim(p_motivo), ''), 'Ajuste manual de stock')
  );
end;
$$;


ALTER FUNCTION "public"."establecer_stock_producto"("p_id_producto" bigint, "p_cantidad" integer, "p_motivo" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generar_codigo_matricula_alumno"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_sequence_name text;
begin
  if new.id is null then
    v_sequence_name := pg_get_serial_sequence('public.alumnos', 'id');

    if v_sequence_name is not null then
      new.id := nextval(v_sequence_name::regclass);
    end if;
  end if;

  if new.codigo_matricula is null or btrim(new.codigo_matricula) = '' then
    new.codigo_matricula := 'ALU-' || lpad(new.id::text, 6, '0');
  else
    new.codigo_matricula := upper(btrim(new.codigo_matricula));
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."generar_codigo_matricula_alumno"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_any_role"("roles" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(public.current_user_role() = any(roles), false)
$$;


ALTER FUNCTION "public"."has_any_role"("roles" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalcular_estado_ingreso_por_discrepancias"("p_id_ingreso" bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."recalcular_estado_ingreso_por_discrepancias"("p_id_ingreso" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalcular_stock_desde_ajustes_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    perform public.recalcular_stock_producto(new.id_producto);
  elsif tg_op = 'DELETE' then
    perform public.recalcular_stock_producto(old.id_producto);
  else
    perform public.recalcular_stock_producto(new.id_producto);

    if new.id_producto <> old.id_producto then
      perform public.recalcular_stock_producto(old.id_producto);
    end if;
  end if;

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."recalcular_stock_desde_ajustes_stock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalcular_stock_desde_detalle_distribucion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    perform public.recalcular_stock_producto(new.id_producto);
  elsif tg_op = 'DELETE' then
    perform public.recalcular_stock_producto(old.id_producto);
  else
    perform public.recalcular_stock_producto(new.id_producto);

    if new.id_producto <> old.id_producto then
      perform public.recalcular_stock_producto(old.id_producto);
    end if;
  end if;

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."recalcular_stock_desde_detalle_distribucion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalcular_stock_desde_detalle_ingreso"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    perform public.recalcular_stock_producto(new.id_producto);
  elsif tg_op = 'DELETE' then
    perform public.recalcular_stock_producto(old.id_producto);
  else
    perform public.recalcular_stock_producto(new.id_producto);

    if new.id_producto <> old.id_producto then
      perform public.recalcular_stock_producto(old.id_producto);
    end if;
  end if;

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."recalcular_stock_desde_detalle_ingreso"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalcular_stock_desde_estado_ingreso"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_producto record;
begin
  if tg_op <> 'UPDATE' then
    return coalesce(new, old);
  end if;

  if new.estado is not distinct from old.estado then
    return new;
  end if;

  for v_producto in
    select distinct di.id_producto
    from public.detalle_ingresos di
    where di.id_ingreso = new.id
  loop
    perform public.recalcular_stock_producto(v_producto.id_producto);
  end loop;

  return new;
end;
$$;


ALTER FUNCTION "public"."recalcular_stock_desde_estado_ingreso"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalcular_stock_producto"("p_id_producto" bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_ingresos integer := 0;
  v_salidas integer := 0;
  v_ajustes integer := 0;
begin
  if p_id_producto is null then
    return;
  end if;

  if not exists (
    select 1
    from public.productos
    where id = p_id_producto
  ) then
    return;
  end if;

  select coalesce(sum(di.cantidad), 0)
  into v_ingresos
  from public.detalle_ingresos di
  join public.ingresos i
    on i.id = di.id_ingreso
  where di.id_producto = p_id_producto
    and i.estado <> 'anulado';

  select coalesce(sum(dd.cantidad), 0)
  into v_salidas
  from public.detalle_distribuciones dd
  where dd.id_producto = p_id_producto;

  select coalesce(sum(a.cantidad_delta), 0)
  into v_ajustes
  from public.ajustes_stock a
  where a.id_producto = p_id_producto;

  insert into public.stock (
    id_producto,
    cantidad_actual,
    actualizado_en
  )
  values (
    p_id_producto,
    greatest(v_ingresos + v_ajustes - v_salidas, 0),
    now()
  )
  on conflict (id_producto)
  do update
  set
    cantidad_actual = excluded.cantidad_actual,
    actualizado_en = excluded.actualizado_en;
end;
$$;


ALTER FUNCTION "public"."recalcular_stock_producto"("p_id_producto" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_discrepancia_ingreso"("p_id_detalle_ingreso" bigint, "p_cantidad_recibida" integer, "p_observaciones" "text" DEFAULT NULL::"text", "p_evidencias" "jsonb" DEFAULT '[]'::"jsonb") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."registrar_discrepancia_ingreso"("p_id_detalle_ingreso" bigint, "p_cantidad_recibida" integer, "p_observaciones" "text", "p_evidencias" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_distribucion_qr"("p_codigo_qr" "uuid", "p_items" "jsonb", "p_fecha" "date" DEFAULT NULL, "p_hora" time DEFAULT NULL, "p_sincronizado" boolean DEFAULT true, "p_origen" character varying DEFAULT 'online'::character varying, "p_observaciones" "text" DEFAULT NULL::"text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_alumno_id bigint;
  v_docente_id bigint;
  v_distribucion_id bigint;
  v_item jsonb;
  v_id_producto bigint;
  v_cantidad integer;
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
    select value
    from jsonb_array_elements(p_items)
  loop
    v_id_producto := nullif(v_item->>'id_producto', '')::bigint;
    v_cantidad := coalesce(nullif(v_item->>'cantidad', '')::integer, 1);

    if v_id_producto is null then
      raise exception 'Cada item debe incluir un id_producto valido.';
    end if;

    if v_cantidad <= 0 then
      raise exception 'La cantidad distribuida debe ser mayor a cero.';
    end if;

    if not exists (
      select 1
      from public.productos p
      where p.id = v_id_producto
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


ALTER FUNCTION "public"."registrar_distribucion_qr"("p_codigo_qr" "uuid", "p_items" "jsonb", "p_sincronizado" boolean, "p_origen" character varying, "p_observaciones" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_ingreso_producto"("p_id_proveedor" bigint, "p_id_producto" bigint, "p_lote" "text", "p_cantidad" integer, "p_peso_kg" numeric, "p_fecha" "date" DEFAULT CURRENT_DATE, "p_fecha_vencimiento" "date" DEFAULT NULL::"date", "p_observaciones" "text" DEFAULT NULL::"text") RETURNS TABLE("id_ingreso" bigint, "id_detalle_ingreso" bigint, "qr_lote" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_id_usuario bigint;
  v_ingreso_id bigint;
  v_detalle_id bigint;
  v_qr_lote uuid;
  v_producto_proveedor bigint;
begin
  if not public.has_any_role(array['administrador', 'almacen']) then
    raise exception 'No tienes permisos para registrar ingresos.';
  end if;

  v_id_usuario := public.current_profile_id();

  if v_id_usuario is null then
    raise exception 'No se encontro el perfil del usuario autenticado.';
  end if;

  if p_id_proveedor is null or p_id_proveedor <= 0 then
    raise exception 'Debes seleccionar un proveedor valido.';
  end if;

  if p_id_producto is null or p_id_producto <= 0 then
    raise exception 'Debes seleccionar un producto valido.';
  end if;

  if p_lote is null or btrim(p_lote) = '' then
    raise exception 'Debes ingresar un lote valido.';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor que cero.';
  end if;

  if p_peso_kg is null or p_peso_kg < 0 then
    raise exception 'El peso no puede ser negativo.';
  end if;

  if not exists (
    select 1
    from public.proveedores pr
    where pr.id = p_id_proveedor
      and pr.activo = true
  ) then
    raise exception 'El proveedor indicado no existe o esta inactivo.';
  end if;

  select p.id_proveedor
  into v_producto_proveedor
  from public.productos p
  where p.id = p_id_producto
    and p.activo = true;

  if v_producto_proveedor is null then
    raise exception 'El producto indicado no existe o esta inactivo.';
  end if;

  if v_producto_proveedor <> p_id_proveedor then
    raise exception 'El producto no pertenece al proveedor seleccionado.';
  end if;

  insert into public.ingresos (
    id_proveedor,
    id_usuario,
    fecha,
    estado,
    observaciones
  )
  values (
    p_id_proveedor,
    v_id_usuario,
    coalesce(p_fecha, current_date),
    'registrado',
    nullif(btrim(coalesce(p_observaciones, '')), '')
  )
  returning id into v_ingreso_id;

  insert into public.detalle_ingresos (
    id_ingreso,
    id_producto,
    lote,
    cantidad,
    peso_kg,
    fecha_vencimiento
  )
  values (
    v_ingreso_id,
    p_id_producto,
    upper(btrim(p_lote)),
    p_cantidad,
    p_peso_kg,
    p_fecha_vencimiento
  )
  returning id, qr_lote
  into v_detalle_id, v_qr_lote;

  return query
  select v_ingreso_id, v_detalle_id, v_qr_lote;
end;
$$;


ALTER FUNCTION "public"."registrar_ingreso_producto"("p_id_proveedor" bigint, "p_id_producto" bigint, "p_lote" "text", "p_cantidad" integer, "p_peso_kg" numeric, "p_fecha" "date", "p_fecha_vencimiento" "date", "p_observaciones" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_movimiento_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_id_usuario bigint;
  v_id_registro bigint;
  v_descripcion text;
  v_metadata jsonb;
begin
  v_id_usuario := public.current_profile_id();

  if tg_op = 'INSERT' then
    v_id_registro := new.id;
    v_descripcion := 'Registro creado en ' || tg_table_name;
    v_metadata := jsonb_build_object('new', to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    v_id_registro := new.id;
    v_descripcion := 'Registro actualizado en ' || tg_table_name;
    v_metadata := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  else
    v_id_registro := old.id;
    v_descripcion := 'Registro eliminado en ' || tg_table_name;
    v_metadata := jsonb_build_object('old', to_jsonb(old));
  end if;

  insert into public.registro_movimientos (
    tipo_accion,
    descripcion,
    id_usuario,
    tabla_origen,
    id_registro,
    metadata,
    creado_en
  )
  values (
    lower(tg_op) || '_' || tg_table_name,
    v_descripcion,
    v_id_usuario,
    tg_table_name,
    v_id_registro,
    v_metadata,
    now()
  );

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."registrar_movimiento_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolver_discrepancia_ingreso"("p_id_discrepancia" bigint, "p_cantidad_final" integer DEFAULT NULL::integer, "p_motivo" "text" DEFAULT NULL::"text", "p_evidencias" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."resolver_discrepancia_ingreso"("p_id_discrepancia" bigint, "p_cantidad_final" integer, "p_motivo" "text", "p_evidencias" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acceso_vehicular" (
    "id" bigint NOT NULL,
    "id_proveedor" bigint NOT NULL,
    "placa" character varying(20) NOT NULL,
    "conductor" character varying(150) NOT NULL,
    "hora_entrada" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hora_salida" timestamp with time zone,
    "ruta_manifiesto" "text",
    "observaciones" "text",
    "registrado_por" bigint NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "acceso_vehicular_horas_check" CHECK ((("hora_salida" IS NULL) OR ("hora_salida" >= "hora_entrada")))
);


ALTER TABLE "public"."acceso_vehicular" OWNER TO "postgres";


ALTER TABLE "public"."acceso_vehicular" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."acceso_vehicular_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."actas_recepcion" (
    "id" bigint NOT NULL,
    "id_ingreso" bigint NOT NULL,
    "ruta_pdf" "text" NOT NULL,
    "generado_por" bigint NOT NULL,
    "generado_en" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."actas_recepcion" OWNER TO "postgres";


ALTER TABLE "public"."actas_recepcion" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."actas_recepcion_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."ajustes_stock" (
    "id" bigint NOT NULL,
    "id_producto" bigint NOT NULL,
    "id_usuario" bigint,
    "tipo_ajuste" character varying(30) DEFAULT 'manual'::character varying NOT NULL,
    "cantidad_delta" integer NOT NULL,
    "motivo" "text",
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ajustes_stock_tipo_ajuste_check" CHECK ((("tipo_ajuste")::"text" = ANY ((ARRAY['manual'::character varying, 'correccion'::character varying, 'sincronizacion'::character varying])::"text"[])))
);


ALTER TABLE "public"."ajustes_stock" OWNER TO "postgres";


ALTER TABLE "public"."ajustes_stock" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."ajustes_stock_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."alumnos" (
    "id" bigint NOT NULL,
    "codigo_matricula" character varying(40) NOT NULL,
    "nombre" character varying(100) NOT NULL,
    "apellido" character varying(100) NOT NULL,
    "dni" character varying(8) NOT NULL,
    "grado" character varying(20) NOT NULL,
    "seccion" character varying(20) NOT NULL,
    "codigo_qr" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "alumnos_dni_formato_check" CHECK ((("dni")::"text" ~ '^\d{8}$'::"text"))
);

ALTER TABLE ONLY "public"."alumnos" REPLICA IDENTITY FULL;


ALTER TABLE "public"."alumnos" OWNER TO "postgres";


ALTER TABLE "public"."alumnos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."alumnos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."checklist_recepcion_items" (
    "id" bigint NOT NULL,
    "id_checklist" bigint NOT NULL,
    "id_producto" bigint NOT NULL,
    "lote" character varying(80),
    "cantidad_manifiesto" integer NOT NULL,
    "cantidad_verificada" integer,
    "conforme" boolean DEFAULT true NOT NULL,
    "observaciones" "text",
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "checklist_recepcion_items_cantidades_check" CHECK ((("cantidad_manifiesto" >= 0) AND (("cantidad_verificada" IS NULL) OR ("cantidad_verificada" >= 0))))
);


ALTER TABLE "public"."checklist_recepcion_items" OWNER TO "postgres";


ALTER TABLE "public"."checklist_recepcion_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."checklist_recepcion_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."checklists_recepcion" (
    "id" bigint NOT NULL,
    "id_ingreso" bigint NOT NULL,
    "id_cae" bigint NOT NULL,
    "estado" character varying(30) DEFAULT 'pendiente'::character varying NOT NULL,
    "observaciones" "text",
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "checklists_recepcion_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['pendiente'::character varying, 'conforme'::character varying, 'con_observaciones'::character varying])::"text"[])))
);


ALTER TABLE "public"."checklists_recepcion" OWNER TO "postgres";


ALTER TABLE "public"."checklists_recepcion" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."checklists_recepcion_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."detalle_distribuciones" (
    "id" bigint NOT NULL,
    "id_distribucion" bigint NOT NULL,
    "id_producto" bigint NOT NULL,
    "cantidad" integer DEFAULT 1 NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "detalle_distribuciones_cantidad_check" CHECK (("cantidad" > 0))
);


ALTER TABLE "public"."detalle_distribuciones" OWNER TO "postgres";


ALTER TABLE "public"."detalle_distribuciones" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."detalle_distribuciones_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."detalle_ingresos" (
    "id" bigint NOT NULL,
    "id_ingreso" bigint NOT NULL,
    "id_producto" bigint NOT NULL,
    "lote" character varying(80) NOT NULL,
    "cantidad" integer NOT NULL,
    "peso_kg" numeric(10,2) DEFAULT 0 NOT NULL,
    "fecha_vencimiento" "date",
    "qr_lote" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unidad_medida" character varying(20) DEFAULT 'kg'::character varying NOT NULL,
    CONSTRAINT "detalle_ingresos_cantidad_check" CHECK ((("cantidad" > 0) AND ("peso_kg" >= (0)::numeric)))
);

ALTER TABLE ONLY "public"."detalle_ingresos" REPLICA IDENTITY FULL;


ALTER TABLE "public"."detalle_ingresos" OWNER TO "postgres";


ALTER TABLE "public"."detalle_ingresos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."detalle_ingresos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."discrepancias" (
    "id" bigint NOT NULL,
    "id_detalle_ingreso" bigint NOT NULL,
    "cantidad_esperada" integer NOT NULL,
    "cantidad_recibida" integer NOT NULL,
    "diferencia" integer DEFAULT 0 NOT NULL,
    "observaciones" "text",
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "estado" character varying(20) DEFAULT 'registrada'::character varying NOT NULL,
    "evidencias" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "creado_por" bigint,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "motivo_resolucion" "text",
    "resuelta_en" timestamp with time zone,
    "resuelta_por" bigint,
    "motivo_anulacion" "text",
    "anulada_en" timestamp with time zone,
    "anulada_por" bigint,
    CONSTRAINT "discrepancias_cantidades_check" CHECK ((("cantidad_esperada" >= 0) AND ("cantidad_recibida" >= 0))),
    CONSTRAINT "discrepancias_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['registrada'::character varying, 'resuelta'::character varying, 'anulada'::character varying])::"text"[])))
);


ALTER TABLE "public"."discrepancias" OWNER TO "postgres";


ALTER TABLE "public"."discrepancias" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."discrepancias_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."distribuciones" (
    "id" bigint NOT NULL,
    "id_alumno" bigint NOT NULL,
    "id_docente" bigint NOT NULL,
    "fecha" "date" DEFAULT CURRENT_DATE NOT NULL,
    "hora" time without time zone DEFAULT LOCALTIME NOT NULL,
    "sincronizado" boolean DEFAULT true NOT NULL,
    "origen" character varying(20) DEFAULT 'online'::character varying NOT NULL,
    "observaciones" "text",
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "distribuciones_origen_check" CHECK ((("origen")::"text" = ANY ((ARRAY['online'::character varying, 'offline'::character varying, 'sincronizado'::character varying])::"text"[])))
);


ALTER TABLE "public"."distribuciones" OWNER TO "postgres";


ALTER TABLE "public"."distribuciones" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."distribuciones_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."ingresos" (
    "id" bigint NOT NULL,
    "id_proveedor" bigint NOT NULL,
    "id_usuario" bigint NOT NULL,
    "id_acceso_vehicular" bigint,
    "fecha" "date" DEFAULT CURRENT_DATE NOT NULL,
    "estado" character varying(30) DEFAULT 'registrado'::character varying NOT NULL,
    "observaciones" "text",
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ingresos_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['registrado'::character varying, 'conforme'::character varying, 'con_discrepancia'::character varying, 'anulado'::character varying])::"text"[])))
);

ALTER TABLE ONLY "public"."ingresos" REPLICA IDENTITY FULL;


ALTER TABLE "public"."ingresos" OWNER TO "postgres";


ALTER TABLE "public"."ingresos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."ingresos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."perfiles" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."perfiles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."planes_distribucion" (
    "id" bigint NOT NULL,
    "fecha" "date" NOT NULL,
    "id_producto" bigint NOT NULL,
    "cantidad_por_alumno" integer DEFAULT 1 NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "creado_por" bigint NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "planes_distribucion_cantidad_check" CHECK (("cantidad_por_alumno" > 0))
);


ALTER TABLE "public"."planes_distribucion" OWNER TO "postgres";


ALTER TABLE "public"."planes_distribucion" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."planes_distribucion_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."productos" (
    "id" bigint NOT NULL,
    "codigo_producto" character varying(50) NOT NULL,
    "nombre" character varying(100) NOT NULL,
    "categoria" character varying(50) DEFAULT 'Otros'::character varying NOT NULL,
    "unidad_medida" character varying(50) DEFAULT 'kg'::character varying NOT NULL,
    "stock_minimo" integer DEFAULT 0 NOT NULL,
    "stock_maximo" integer DEFAULT 100 NOT NULL,
    "id_proveedor" bigint,
    "activo" boolean DEFAULT true NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "productos_categoria_check" CHECK (("btrim"(("categoria")::"text") <> ''::"text")),
    CONSTRAINT "productos_codigo_producto_check" CHECK (("btrim"(("codigo_producto")::"text") <> ''::"text")),
    CONSTRAINT "productos_stock_rangos_check" CHECK ((("stock_minimo" >= 0) AND ("stock_maximo" > "stock_minimo"))),
    CONSTRAINT "productos_unidad_medida_check" CHECK (("btrim"(("unidad_medida")::"text") <> ''::"text"))
);

ALTER TABLE ONLY "public"."productos" REPLICA IDENTITY FULL;


ALTER TABLE "public"."productos" OWNER TO "postgres";


ALTER TABLE "public"."productos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."productos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."proveedores" (
    "id" bigint NOT NULL,
    "nombre" character varying(100) NOT NULL,
    "ruc" character varying(11) NOT NULL,
    "contacto" character varying(100),
    "telefono" character varying(20),
    "direccion" character varying(150),
    "tipo_producto" character varying(100) DEFAULT 'General'::character varying NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "proveedores_ruc_formato_check" CHECK ((("ruc")::"text" ~ '^\d{11}$'::"text"))
);

ALTER TABLE ONLY "public"."proveedores" REPLICA IDENTITY FULL;


ALTER TABLE "public"."proveedores" OWNER TO "postgres";


ALTER TABLE "public"."proveedores" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."proveedores_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."registro_movimientos" (
    "id" bigint NOT NULL,
    "tipo_accion" character varying(80) NOT NULL,
    "descripcion" "text" NOT NULL,
    "id_usuario" bigint,
    "tabla_origen" character varying(60),
    "id_registro" bigint,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."registro_movimientos" OWNER TO "postgres";


ALTER TABLE "public"."registro_movimientos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."registro_movimientos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."reportes" (
    "id" bigint NOT NULL,
    "tipo" character varying(30) NOT NULL,
    "rango_inicio" "date" NOT NULL,
    "rango_fin" "date" NOT NULL,
    "formato" character varying(10) NOT NULL,
    "ruta_archivo" "text" NOT NULL,
    "filtros" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "generado_por" bigint NOT NULL,
    "generado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reportes_formato_check" CHECK ((("formato")::"text" = ANY ((ARRAY['pdf'::character varying, 'xlsx'::character varying])::"text"[]))),
    CONSTRAINT "reportes_rango_check" CHECK (("rango_fin" >= "rango_inicio")),
    CONSTRAINT "reportes_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['inventario'::character varying, 'distribuciones'::character varying, 'movimientos'::character varying, 'recepcion'::character varying, 'alumnos'::character varying, 'stock'::character varying])::"text"[])))
);


ALTER TABLE "public"."reportes" OWNER TO "postgres";


ALTER TABLE "public"."reportes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."reportes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."respaldos_sistema" (
    "id" bigint NOT NULL,
    "tipo" character varying(20) DEFAULT 'manual'::character varying NOT NULL,
    "estado" character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    "ruta_archivo" "text",
    "solicitado_por" bigint NOT NULL,
    "observaciones" "text",
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completado_en" timestamp with time zone,
    CONSTRAINT "respaldos_sistema_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['pendiente'::character varying, 'procesando'::character varying, 'completado'::character varying, 'fallido'::character varying])::"text"[]))),
    CONSTRAINT "respaldos_sistema_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['manual'::character varying, 'programado'::character varying])::"text"[])))
);


ALTER TABLE "public"."respaldos_sistema" OWNER TO "postgres";


ALTER TABLE "public"."respaldos_sistema" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."respaldos_sistema_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."stock" (
    "id" bigint NOT NULL,
    "id_producto" bigint NOT NULL,
    "cantidad_actual" integer DEFAULT 0 NOT NULL,
    "actualizado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stock_cantidad_actual_check" CHECK (("cantidad_actual" >= 0))
);

ALTER TABLE ONLY "public"."stock" REPLICA IDENTITY FULL;


ALTER TABLE "public"."stock" OWNER TO "postgres";


ALTER TABLE "public"."stock" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."stock_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."v_usuarios" WITH ("security_invoker"='false') AS
 SELECT "p"."id",
    "p"."id_usuario_auth",
    "u"."email",
    "p"."nombre_completo",
    "p"."telefono",
    "p"."dni",
    "p"."id_alumno",
    "p"."rol",
    "p"."activo",
    "p"."creado_en",
    "p"."actualizado_en"
   FROM ("public"."perfiles" "p"
     LEFT JOIN "auth"."users" "u" ON (("u"."id" = "p"."id_usuario_auth")));


ALTER VIEW "public"."v_usuarios" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_inventario_actual" AS
 SELECT "p"."id",
    "p"."codigo_producto",
    "p"."nombre",
    "p"."categoria",
    "p"."unidad_medida",
    "p"."stock_minimo",
    "p"."stock_maximo",
    "p"."activo",
    "p"."creado_en",
    "pr"."id" AS "id_proveedor",
    "pr"."nombre" AS "proveedor",
    COALESCE("s"."cantidad_actual", 0) AS "stock_actual",
    "s"."actualizado_en",
        CASE
            WHEN ("p"."activo" = false) THEN 'inactivo'::"text"
            WHEN (COALESCE("s"."cantidad_actual", 0) <= 0) THEN 'sin_stock'::"text"
            WHEN (COALESCE("s"."cantidad_actual", 0) <= "p"."stock_minimo") THEN 'stock_bajo'::"text"
            WHEN (COALESCE("s"."cantidad_actual", 0) >= "p"."stock_maximo") THEN 'stock_alto'::"text"
            ELSE 'estable'::"text"
        END AS "nivel_alerta"
   FROM (("public"."productos" "p"
     LEFT JOIN "public"."proveedores" "pr" ON (("pr"."id" = "p"."id_proveedor")))
     LEFT JOIN "public"."stock" "s" ON (("s"."id_producto" = "p"."id")));


ALTER VIEW "public"."vw_inventario_actual" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_alertas_stock" AS
 SELECT "id",
    "codigo_producto",
    "nombre",
    "categoria",
    "unidad_medida",
    "stock_minimo",
    "stock_maximo",
    "activo",
    "creado_en",
    "id_proveedor",
    "proveedor",
    "stock_actual",
    "actualizado_en",
    "nivel_alerta"
   FROM "public"."vw_inventario_actual"
  WHERE ("nivel_alerta" = ANY (ARRAY['sin_stock'::"text", 'stock_bajo'::"text", 'stock_alto'::"text"]));


ALTER VIEW "public"."vw_alertas_stock" OWNER TO "postgres";


ALTER TABLE ONLY "public"."acceso_vehicular"
    ADD CONSTRAINT "acceso_vehicular_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."actas_recepcion"
    ADD CONSTRAINT "actas_recepcion_id_ingreso_key" UNIQUE ("id_ingreso");



ALTER TABLE ONLY "public"."actas_recepcion"
    ADD CONSTRAINT "actas_recepcion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ajustes_stock"
    ADD CONSTRAINT "ajustes_stock_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alumnos"
    ADD CONSTRAINT "alumnos_codigo_matricula_key" UNIQUE ("codigo_matricula");



ALTER TABLE ONLY "public"."alumnos"
    ADD CONSTRAINT "alumnos_codigo_qr_key" UNIQUE ("codigo_qr");



ALTER TABLE ONLY "public"."alumnos"
    ADD CONSTRAINT "alumnos_dni_key" UNIQUE ("dni");



ALTER TABLE ONLY "public"."alumnos"
    ADD CONSTRAINT "alumnos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_recepcion_items"
    ADD CONSTRAINT "checklist_recepcion_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklists_recepcion"
    ADD CONSTRAINT "checklists_recepcion_id_ingreso_key" UNIQUE ("id_ingreso");



ALTER TABLE ONLY "public"."checklists_recepcion"
    ADD CONSTRAINT "checklists_recepcion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."detalle_distribuciones"
    ADD CONSTRAINT "detalle_distribuciones_id_distribucion_id_producto_key" UNIQUE ("id_distribucion", "id_producto");



ALTER TABLE ONLY "public"."detalle_distribuciones"
    ADD CONSTRAINT "detalle_distribuciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."detalle_ingresos"
    ADD CONSTRAINT "detalle_ingresos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."detalle_ingresos"
    ADD CONSTRAINT "detalle_ingresos_qr_lote_key" UNIQUE ("qr_lote");



ALTER TABLE ONLY "public"."discrepancias"
    ADD CONSTRAINT "discrepancias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."distribuciones"
    ADD CONSTRAINT "distribuciones_id_alumno_fecha_key" UNIQUE ("id_alumno", "fecha");



ALTER TABLE ONLY "public"."distribuciones"
    ADD CONSTRAINT "distribuciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ingresos"
    ADD CONSTRAINT "ingresos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."perfiles"
    ADD CONSTRAINT "perfiles_id_usuario_auth_key" UNIQUE ("id_usuario_auth");



ALTER TABLE ONLY "public"."perfiles"
    ADD CONSTRAINT "perfiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."planes_distribucion"
    ADD CONSTRAINT "planes_distribucion_fecha_id_producto_key" UNIQUE ("fecha", "id_producto");



ALTER TABLE ONLY "public"."planes_distribucion"
    ADD CONSTRAINT "planes_distribucion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."productos"
    ADD CONSTRAINT "productos_codigo_producto_key" UNIQUE ("codigo_producto");



ALTER TABLE ONLY "public"."productos"
    ADD CONSTRAINT "productos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proveedores"
    ADD CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proveedores"
    ADD CONSTRAINT "proveedores_ruc_key" UNIQUE ("ruc");



ALTER TABLE ONLY "public"."registro_movimientos"
    ADD CONSTRAINT "registro_movimientos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reportes"
    ADD CONSTRAINT "reportes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."respaldos_sistema"
    ADD CONSTRAINT "respaldos_sistema_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock"
    ADD CONSTRAINT "stock_id_producto_key" UNIQUE ("id_producto");



ALTER TABLE ONLY "public"."stock"
    ADD CONSTRAINT "stock_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_acceso_vehicular_hora_entrada" ON "public"."acceso_vehicular" USING "btree" ("hora_entrada" DESC);



CREATE INDEX "idx_checklist_items_checklist" ON "public"."checklist_recepcion_items" USING "btree" ("id_checklist");



CREATE INDEX "idx_detalle_ingresos_producto" ON "public"."detalle_ingresos" USING "btree" ("id_producto");



CREATE INDEX "idx_discrepancias_detalle_estado_creado" ON "public"."discrepancias" USING "btree" ("id_detalle_ingreso", "estado", "creado_en" DESC);



CREATE INDEX "idx_distribuciones_docente" ON "public"."distribuciones" USING "btree" ("id_docente");



CREATE INDEX "idx_distribuciones_fecha" ON "public"."distribuciones" USING "btree" ("fecha" DESC);



CREATE INDEX "idx_ingresos_fecha" ON "public"."ingresos" USING "btree" ("fecha" DESC);



CREATE INDEX "idx_perfiles_id_alumno" ON "public"."perfiles" USING "btree" ("id_alumno");



CREATE INDEX "idx_perfiles_rol" ON "public"."perfiles" USING "btree" ("rol");



CREATE INDEX "idx_productos_categoria" ON "public"."productos" USING "btree" ("categoria");



CREATE INDEX "idx_productos_id_proveedor" ON "public"."productos" USING "btree" ("id_proveedor");



CREATE INDEX "idx_registro_movimientos_creado_en" ON "public"."registro_movimientos" USING "btree" ("creado_en" DESC);



CREATE INDEX "idx_registro_movimientos_tipo" ON "public"."registro_movimientos" USING "btree" ("tipo_accion");



CREATE OR REPLACE TRIGGER "audit_acceso_vehicular" AFTER INSERT OR DELETE OR UPDATE ON "public"."acceso_vehicular" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_movimiento_trigger"();



CREATE OR REPLACE TRIGGER "audit_actas_recepcion" AFTER INSERT OR DELETE OR UPDATE ON "public"."actas_recepcion" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_movimiento_trigger"();



CREATE OR REPLACE TRIGGER "audit_ajustes_stock" AFTER INSERT OR DELETE OR UPDATE ON "public"."ajustes_stock" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_movimiento_trigger"();



CREATE OR REPLACE TRIGGER "audit_alumnos" AFTER INSERT OR DELETE OR UPDATE ON "public"."alumnos" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_movimiento_trigger"();



CREATE OR REPLACE TRIGGER "audit_checklist_recepcion_items" AFTER INSERT OR DELETE OR UPDATE ON "public"."checklist_recepcion_items" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_movimiento_trigger"();



CREATE OR REPLACE TRIGGER "audit_checklists_recepcion" AFTER INSERT OR DELETE OR UPDATE ON "public"."checklists_recepcion" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_movimiento_trigger"();



CREATE OR REPLACE TRIGGER "audit_detalle_distribuciones" AFTER INSERT OR DELETE OR UPDATE ON "public"."detalle_distribuciones" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_movimiento_trigger"();



CREATE OR REPLACE TRIGGER "audit_detalle_ingresos" AFTER INSERT OR DELETE OR UPDATE ON "public"."detalle_ingresos" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_movimiento_trigger"();



CREATE OR REPLACE TRIGGER "audit_discrepancias" AFTER INSERT OR DELETE OR UPDATE ON "public"."discrepancias" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_movimiento_trigger"();



CREATE OR REPLACE TRIGGER "audit_distribuciones" AFTER INSERT OR DELETE OR UPDATE ON "public"."distribuciones" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_movimiento_trigger"();



CREATE OR REPLACE TRIGGER "audit_ingresos" AFTER INSERT OR DELETE OR UPDATE ON "public"."ingresos" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_movimiento_trigger"();



CREATE OR REPLACE TRIGGER "audit_productos" AFTER INSERT OR DELETE OR UPDATE ON "public"."productos" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_movimiento_trigger"();



CREATE OR REPLACE TRIGGER "audit_proveedores" AFTER INSERT OR DELETE OR UPDATE ON "public"."proveedores" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_movimiento_trigger"();



CREATE OR REPLACE TRIGGER "audit_reportes" AFTER INSERT OR DELETE OR UPDATE ON "public"."reportes" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_movimiento_trigger"();



CREATE OR REPLACE TRIGGER "audit_respaldos_sistema" AFTER INSERT OR DELETE OR UPDATE ON "public"."respaldos_sistema" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_movimiento_trigger"();



CREATE OR REPLACE TRIGGER "trigger_actualizar_diferencia_discrepancia" BEFORE INSERT OR UPDATE ON "public"."discrepancias" FOR EACH ROW EXECUTE FUNCTION "public"."actualizar_diferencia_discrepancia"();



CREATE OR REPLACE TRIGGER "trigger_alumnos_updated_at" BEFORE UPDATE ON "public"."alumnos" FOR EACH ROW EXECUTE FUNCTION "public"."handle_set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_checklists_recepcion_updated_at" BEFORE UPDATE ON "public"."checklists_recepcion" FOR EACH ROW EXECUTE FUNCTION "public"."handle_set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_crear_stock_inicial" AFTER INSERT ON "public"."productos" FOR EACH ROW EXECUTE FUNCTION "public"."crear_stock_inicial_producto"();



CREATE OR REPLACE TRIGGER "trigger_discrepancias_set_actualizado_en" BEFORE UPDATE ON "public"."discrepancias" FOR EACH ROW EXECUTE FUNCTION "public"."discrepancias_set_actualizado_en"();



CREATE OR REPLACE TRIGGER "trigger_generar_codigo_matricula_alumno" BEFORE INSERT ON "public"."alumnos" FOR EACH ROW EXECUTE FUNCTION "public"."generar_codigo_matricula_alumno"();



CREATE OR REPLACE TRIGGER "trigger_perfiles_updated_at" BEFORE UPDATE ON "public"."perfiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_productos_updated_at" BEFORE UPDATE ON "public"."productos" FOR EACH ROW EXECUTE FUNCTION "public"."handle_set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_proveedores_updated_at" BEFORE UPDATE ON "public"."proveedores" FOR EACH ROW EXECUTE FUNCTION "public"."handle_set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_recalcular_stock_ajustes" AFTER INSERT OR DELETE OR UPDATE ON "public"."ajustes_stock" FOR EACH ROW EXECUTE FUNCTION "public"."recalcular_stock_desde_ajustes_stock"();



CREATE OR REPLACE TRIGGER "trigger_recalcular_stock_detalle_distribucion" AFTER INSERT OR DELETE OR UPDATE ON "public"."detalle_distribuciones" FOR EACH ROW EXECUTE FUNCTION "public"."recalcular_stock_desde_detalle_distribucion"();



CREATE OR REPLACE TRIGGER "trigger_recalcular_stock_detalle_ingreso" AFTER INSERT OR DELETE OR UPDATE ON "public"."detalle_ingresos" FOR EACH ROW EXECUTE FUNCTION "public"."recalcular_stock_desde_detalle_ingreso"();



CREATE OR REPLACE TRIGGER "trigger_recalcular_stock_estado_ingreso" AFTER UPDATE OF "estado" ON "public"."ingresos" FOR EACH ROW EXECUTE FUNCTION "public"."recalcular_stock_desde_estado_ingreso"();



ALTER TABLE ONLY "public"."acceso_vehicular"
    ADD CONSTRAINT "acceso_vehicular_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "public"."proveedores"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."acceso_vehicular"
    ADD CONSTRAINT "acceso_vehicular_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "public"."perfiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."actas_recepcion"
    ADD CONSTRAINT "actas_recepcion_generado_por_fkey" FOREIGN KEY ("generado_por") REFERENCES "public"."perfiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."actas_recepcion"
    ADD CONSTRAINT "actas_recepcion_id_ingreso_fkey" FOREIGN KEY ("id_ingreso") REFERENCES "public"."ingresos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ajustes_stock"
    ADD CONSTRAINT "ajustes_stock_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "public"."productos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ajustes_stock"
    ADD CONSTRAINT "ajustes_stock_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."perfiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checklist_recepcion_items"
    ADD CONSTRAINT "checklist_recepcion_items_id_checklist_fkey" FOREIGN KEY ("id_checklist") REFERENCES "public"."checklists_recepcion"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_recepcion_items"
    ADD CONSTRAINT "checklist_recepcion_items_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "public"."productos"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."checklists_recepcion"
    ADD CONSTRAINT "checklists_recepcion_id_cae_fkey" FOREIGN KEY ("id_cae") REFERENCES "public"."perfiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."checklists_recepcion"
    ADD CONSTRAINT "checklists_recepcion_id_ingreso_fkey" FOREIGN KEY ("id_ingreso") REFERENCES "public"."ingresos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."detalle_distribuciones"
    ADD CONSTRAINT "detalle_distribuciones_id_distribucion_fkey" FOREIGN KEY ("id_distribucion") REFERENCES "public"."distribuciones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."detalle_distribuciones"
    ADD CONSTRAINT "detalle_distribuciones_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "public"."productos"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."detalle_ingresos"
    ADD CONSTRAINT "detalle_ingresos_id_ingreso_fkey" FOREIGN KEY ("id_ingreso") REFERENCES "public"."ingresos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."detalle_ingresos"
    ADD CONSTRAINT "detalle_ingresos_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "public"."productos"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."discrepancias"
    ADD CONSTRAINT "discrepancias_anulada_por_fkey" FOREIGN KEY ("anulada_por") REFERENCES "public"."perfiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."discrepancias"
    ADD CONSTRAINT "discrepancias_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "public"."perfiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."discrepancias"
    ADD CONSTRAINT "discrepancias_id_detalle_ingreso_fkey" FOREIGN KEY ("id_detalle_ingreso") REFERENCES "public"."detalle_ingresos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discrepancias"
    ADD CONSTRAINT "discrepancias_resuelta_por_fkey" FOREIGN KEY ("resuelta_por") REFERENCES "public"."perfiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."distribuciones"
    ADD CONSTRAINT "distribuciones_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "public"."alumnos"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."distribuciones"
    ADD CONSTRAINT "distribuciones_id_docente_fkey" FOREIGN KEY ("id_docente") REFERENCES "public"."perfiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ingresos"
    ADD CONSTRAINT "ingresos_id_acceso_vehicular_fkey" FOREIGN KEY ("id_acceso_vehicular") REFERENCES "public"."acceso_vehicular"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ingresos"
    ADD CONSTRAINT "ingresos_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "public"."proveedores"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ingresos"
    ADD CONSTRAINT "ingresos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."perfiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."perfiles"
    ADD CONSTRAINT "perfiles_id_alumno_fkey" FOREIGN KEY ("id_alumno") REFERENCES "public"."alumnos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."perfiles"
    ADD CONSTRAINT "perfiles_id_usuario_auth_fkey" FOREIGN KEY ("id_usuario_auth") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."planes_distribucion"
    ADD CONSTRAINT "planes_distribucion_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "public"."perfiles"("id");



ALTER TABLE ONLY "public"."planes_distribucion"
    ADD CONSTRAINT "planes_distribucion_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "public"."productos"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."productos"
    ADD CONSTRAINT "productos_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "public"."proveedores"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registro_movimientos"
    ADD CONSTRAINT "registro_movimientos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."perfiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reportes"
    ADD CONSTRAINT "reportes_generado_por_fkey" FOREIGN KEY ("generado_por") REFERENCES "public"."perfiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."respaldos_sistema"
    ADD CONSTRAINT "respaldos_sistema_solicitado_por_fkey" FOREIGN KEY ("solicitado_por") REFERENCES "public"."perfiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stock"
    ADD CONSTRAINT "stock_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "public"."productos"("id") ON DELETE CASCADE;



ALTER TABLE "public"."acceso_vehicular" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "acceso_vehicular_delete_admin" ON "public"."acceso_vehicular" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "acceso_vehicular_insert_operativo" ON "public"."acceso_vehicular" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'operario_logistico'::"text"]));



CREATE POLICY "acceso_vehicular_select_operativo" ON "public"."acceso_vehicular" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text", 'almacen'::"text", 'operario_logistico'::"text"]));



CREATE POLICY "acceso_vehicular_update_operativo" ON "public"."acceso_vehicular" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'operario_logistico'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'operario_logistico'::"text"]));



ALTER TABLE "public"."actas_recepcion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "actas_recepcion_delete_admin" ON "public"."actas_recepcion" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "actas_recepcion_insert_operativo" ON "public"."actas_recepcion" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text"]));



CREATE POLICY "actas_recepcion_select_operativo" ON "public"."actas_recepcion" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text", 'almacen'::"text"]));



CREATE POLICY "actas_recepcion_update_operativo" ON "public"."actas_recepcion" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text"]));



ALTER TABLE "public"."ajustes_stock" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ajustes_stock_select_operativo" ON "public"."ajustes_stock" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text", 'almacen'::"text"]));



ALTER TABLE "public"."alumnos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "alumnos_delete_admin" ON "public"."alumnos" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "alumnos_insert_admin" ON "public"."alumnos" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "alumnos_select_operativo" ON "public"."alumnos" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text", 'almacen'::"text", 'docente'::"text", 'operario_logistico'::"text"]));



CREATE POLICY "alumnos_select_padre" ON "public"."alumnos" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'padre_familia'::"text") AND ("id" = "public"."current_linked_student_id"())));



CREATE POLICY "alumnos_update_admin" ON "public"."alumnos" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text"]));



ALTER TABLE "public"."checklist_recepcion_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklist_recepcion_items_delete_admin" ON "public"."checklist_recepcion_items" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "checklist_recepcion_items_insert_operativo" ON "public"."checklist_recepcion_items" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'cae'::"text", 'almacen'::"text"]));



CREATE POLICY "checklist_recepcion_items_select_operativo" ON "public"."checklist_recepcion_items" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text", 'almacen'::"text"]));



CREATE POLICY "checklist_recepcion_items_update_operativo" ON "public"."checklist_recepcion_items" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'cae'::"text", 'almacen'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'cae'::"text", 'almacen'::"text"]));



ALTER TABLE "public"."checklists_recepcion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checklists_recepcion_delete_admin" ON "public"."checklists_recepcion" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "checklists_recepcion_insert_operativo" ON "public"."checklists_recepcion" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'cae'::"text", 'almacen'::"text"]));



CREATE POLICY "checklists_recepcion_select_operativo" ON "public"."checklists_recepcion" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text", 'almacen'::"text"]));



CREATE POLICY "checklists_recepcion_update_operativo" ON "public"."checklists_recepcion" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'cae'::"text", 'almacen'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'cae'::"text", 'almacen'::"text"]));



ALTER TABLE "public"."detalle_distribuciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "detalle_distribuciones_delete_admin" ON "public"."detalle_distribuciones" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "detalle_distribuciones_insert_operativo" ON "public"."detalle_distribuciones" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'docente'::"text"]));



CREATE POLICY "detalle_distribuciones_select_operativo" ON "public"."detalle_distribuciones" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text", 'almacen'::"text", 'docente'::"text"]));



CREATE POLICY "detalle_distribuciones_update_operativo" ON "public"."detalle_distribuciones" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'docente'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'docente'::"text"]));



ALTER TABLE "public"."detalle_ingresos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "detalle_ingresos_delete_admin" ON "public"."detalle_ingresos" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "detalle_ingresos_insert_operativo" ON "public"."detalle_ingresos" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text"]));



CREATE POLICY "detalle_ingresos_select_operativo" ON "public"."detalle_ingresos" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text", 'almacen'::"text", 'docente'::"text"]));



CREATE POLICY "detalle_ingresos_update_operativo" ON "public"."detalle_ingresos" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text"]));



ALTER TABLE "public"."discrepancias" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discrepancias_delete_admin" ON "public"."discrepancias" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "discrepancias_insert_operativo" ON "public"."discrepancias" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text", 'cae'::"text"]));



CREATE POLICY "discrepancias_select_operativo" ON "public"."discrepancias" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text", 'almacen'::"text"]));



CREATE POLICY "discrepancias_update_operativo" ON "public"."discrepancias" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text", 'cae'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text", 'cae'::"text"]));



ALTER TABLE "public"."distribuciones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "distribuciones_delete_admin" ON "public"."distribuciones" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "distribuciones_insert_operativo" ON "public"."distribuciones" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'docente'::"text"]));



CREATE POLICY "distribuciones_select_operativo" ON "public"."distribuciones" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text", 'almacen'::"text", 'docente'::"text"]));



CREATE POLICY "distribuciones_select_padre" ON "public"."distribuciones" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'padre_familia'::"text") AND ("id_alumno" = "public"."current_linked_student_id"())));



CREATE POLICY "distribuciones_update_operativo" ON "public"."distribuciones" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'docente'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'docente'::"text"]));



ALTER TABLE "public"."ingresos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ingresos_delete_admin" ON "public"."ingresos" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "ingresos_insert_operativo" ON "public"."ingresos" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text"]));



CREATE POLICY "ingresos_select_operativo" ON "public"."ingresos" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text", 'almacen'::"text", 'docente'::"text"]));



CREATE POLICY "ingresos_update_operativo" ON "public"."ingresos" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text"]));



ALTER TABLE "public"."perfiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "perfiles_delete_admin" ON "public"."perfiles" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "perfiles_insert_admin" ON "public"."perfiles" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "perfiles_select_self_or_admin" ON "public"."perfiles" FOR SELECT TO "authenticated" USING (("public"."has_any_role"(ARRAY['administrador'::"text"]) OR ("id_usuario_auth" = "auth"."uid"())));



CREATE POLICY "perfiles_update_admin" ON "public"."perfiles" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "planes_delete" ON "public"."planes_distribucion" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'cae'::"text"]));



ALTER TABLE "public"."planes_distribucion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "planes_insert" ON "public"."planes_distribucion" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'cae'::"text"]));



CREATE POLICY "planes_select" ON "public"."planes_distribucion" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text", 'almacen'::"text"]));



CREATE POLICY "planes_update" ON "public"."planes_distribucion" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'cae'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'cae'::"text"]));



ALTER TABLE "public"."productos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "productos_delete_operativo" ON "public"."productos" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text"]));



CREATE POLICY "productos_insert_operativo" ON "public"."productos" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text"]));



CREATE POLICY "productos_select_operativo" ON "public"."productos" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text", 'almacen'::"text", 'docente'::"text", 'operario_logistico'::"text"]));



CREATE POLICY "productos_update_operativo" ON "public"."productos" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text"]));



ALTER TABLE "public"."proveedores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "proveedores_delete_admin" ON "public"."proveedores" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "proveedores_insert_operativo" ON "public"."proveedores" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text"]));



CREATE POLICY "proveedores_select_operativo" ON "public"."proveedores" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text", 'almacen'::"text", 'docente'::"text", 'operario_logistico'::"text"]));



CREATE POLICY "proveedores_update_operativo" ON "public"."proveedores" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'almacen'::"text"]));



ALTER TABLE "public"."registro_movimientos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "registro_movimientos_select_operativo" ON "public"."registro_movimientos" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text"]));



ALTER TABLE "public"."reportes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reportes_delete_admin" ON "public"."reportes" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "reportes_insert_operativo" ON "public"."reportes" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text"]));



CREATE POLICY "reportes_select_operativo" ON "public"."reportes" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text"]));



CREATE POLICY "reportes_update_operativo" ON "public"."reportes" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text"]));



ALTER TABLE "public"."respaldos_sistema" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "respaldos_sistema_delete_admin" ON "public"."respaldos_sistema" FOR DELETE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "respaldos_sistema_insert_admin" ON "public"."respaldos_sistema" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "respaldos_sistema_select_admin" ON "public"."respaldos_sistema" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"]));



CREATE POLICY "respaldos_sistema_update_admin" ON "public"."respaldos_sistema" FOR UPDATE TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text"])) WITH CHECK ("public"."has_any_role"(ARRAY['administrador'::"text"]));



ALTER TABLE "public"."stock" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stock_select_operativo" ON "public"."stock" FOR SELECT TO "authenticated" USING ("public"."has_any_role"(ARRAY['administrador'::"text", 'director'::"text", 'cae'::"text", 'almacen'::"text", 'docente'::"text", 'operario_logistico'::"text"]));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."actualizar_diferencia_discrepancia"() TO "anon";
GRANT ALL ON FUNCTION "public"."actualizar_diferencia_discrepancia"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."actualizar_diferencia_discrepancia"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ajustar_stock_producto"("p_id_producto" bigint, "p_delta" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."ajustar_stock_producto"("p_id_producto" bigint, "p_delta" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ajustar_stock_producto"("p_id_producto" bigint, "p_delta" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."ajustar_stock_producto"("p_id_producto" bigint, "p_delta" integer, "p_motivo" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ajustar_stock_producto"("p_id_producto" bigint, "p_delta" integer, "p_motivo" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ajustar_stock_producto"("p_id_producto" bigint, "p_delta" integer, "p_motivo" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."anular_discrepancia_ingreso"("p_id_discrepancia" bigint, "p_motivo" "text", "p_evidencias" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."anular_discrepancia_ingreso"("p_id_discrepancia" bigint, "p_motivo" "text", "p_evidencias" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."anular_discrepancia_ingreso"("p_id_discrepancia" bigint, "p_motivo" "text", "p_evidencias" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."crear_perfil_desde_auth"() TO "anon";
GRANT ALL ON FUNCTION "public"."crear_perfil_desde_auth"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."crear_perfil_desde_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."crear_stock_inicial_producto"() TO "anon";
GRANT ALL ON FUNCTION "public"."crear_stock_inicial_producto"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."crear_stock_inicial_producto"() TO "service_role";



GRANT ALL ON TABLE "public"."perfiles" TO "anon";
GRANT ALL ON TABLE "public"."perfiles" TO "authenticated";
GRANT ALL ON TABLE "public"."perfiles" TO "service_role";



REVOKE ALL ON FUNCTION "public"."crear_usuario_completo"("p_email" "text", "p_nombre_completo" "text", "p_dni" "text", "p_telefono" "text", "p_rol" "text", "p_activo" boolean, "p_id_alumno" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."crear_usuario_completo"("p_email" "text", "p_nombre_completo" "text", "p_dni" "text", "p_telefono" "text", "p_rol" "text", "p_activo" boolean, "p_id_alumno" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."crear_usuario_completo"("p_email" "text", "p_nombre_completo" "text", "p_dni" "text", "p_telefono" "text", "p_rol" "text", "p_activo" boolean, "p_id_alumno" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."crear_usuario_completo"("p_email" "text", "p_nombre_completo" "text", "p_dni" "text", "p_telefono" "text", "p_rol" "text", "p_activo" boolean, "p_id_alumno" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."current_linked_student_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_linked_student_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_linked_student_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_profile_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_profile_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_profile_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."discrepancias_set_actualizado_en"() TO "anon";
GRANT ALL ON FUNCTION "public"."discrepancias_set_actualizado_en"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."discrepancias_set_actualizado_en"() TO "service_role";



GRANT ALL ON FUNCTION "public"."establecer_stock_producto"("p_id_producto" bigint, "p_cantidad" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."establecer_stock_producto"("p_id_producto" bigint, "p_cantidad" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."establecer_stock_producto"("p_id_producto" bigint, "p_cantidad" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."establecer_stock_producto"("p_id_producto" bigint, "p_cantidad" integer, "p_motivo" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."establecer_stock_producto"("p_id_producto" bigint, "p_cantidad" integer, "p_motivo" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."establecer_stock_producto"("p_id_producto" bigint, "p_cantidad" integer, "p_motivo" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generar_codigo_matricula_alumno"() TO "anon";
GRANT ALL ON FUNCTION "public"."generar_codigo_matricula_alumno"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generar_codigo_matricula_alumno"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_any_role"("roles" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."has_any_role"("roles" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_any_role"("roles" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."recalcular_estado_ingreso_por_discrepancias"("p_id_ingreso" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."recalcular_estado_ingreso_por_discrepancias"("p_id_ingreso" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalcular_estado_ingreso_por_discrepancias"("p_id_ingreso" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."recalcular_stock_desde_ajustes_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalcular_stock_desde_ajustes_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalcular_stock_desde_ajustes_stock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalcular_stock_desde_detalle_distribucion"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalcular_stock_desde_detalle_distribucion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalcular_stock_desde_detalle_distribucion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalcular_stock_desde_detalle_ingreso"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalcular_stock_desde_detalle_ingreso"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalcular_stock_desde_detalle_ingreso"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalcular_stock_desde_estado_ingreso"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalcular_stock_desde_estado_ingreso"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalcular_stock_desde_estado_ingreso"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalcular_stock_producto"("p_id_producto" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."recalcular_stock_producto"("p_id_producto" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalcular_stock_producto"("p_id_producto" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."registrar_discrepancia_ingreso"("p_id_detalle_ingreso" bigint, "p_cantidad_recibida" integer, "p_observaciones" "text", "p_evidencias" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."registrar_discrepancia_ingreso"("p_id_detalle_ingreso" bigint, "p_cantidad_recibida" integer, "p_observaciones" "text", "p_evidencias" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."registrar_discrepancia_ingreso"("p_id_detalle_ingreso" bigint, "p_cantidad_recibida" integer, "p_observaciones" "text", "p_evidencias" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."registrar_distribucion_qr"("p_codigo_qr" "uuid", "p_items" "jsonb", "p_fecha" "date", "p_hora" time, "p_sincronizado" boolean, "p_origen" character varying, "p_observaciones" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."registrar_distribucion_qr"("p_codigo_qr" "uuid", "p_items" "jsonb", "p_fecha" "date", "p_hora" time, "p_sincronizado" boolean, "p_origen" character varying, "p_observaciones" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."registrar_distribucion_qr"("p_codigo_qr" "uuid", "p_items" "jsonb", "p_fecha" "date", "p_hora" time, "p_sincronizado" boolean, "p_origen" character varying, "p_observaciones" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."registrar_ingreso_producto"("p_id_proveedor" bigint, "p_id_producto" bigint, "p_lote" "text", "p_cantidad" integer, "p_peso_kg" numeric, "p_fecha" "date", "p_fecha_vencimiento" "date", "p_observaciones" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."registrar_ingreso_producto"("p_id_proveedor" bigint, "p_id_producto" bigint, "p_lote" "text", "p_cantidad" integer, "p_peso_kg" numeric, "p_fecha" "date", "p_fecha_vencimiento" "date", "p_observaciones" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."registrar_ingreso_producto"("p_id_proveedor" bigint, "p_id_producto" bigint, "p_lote" "text", "p_cantidad" integer, "p_peso_kg" numeric, "p_fecha" "date", "p_fecha_vencimiento" "date", "p_observaciones" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."registrar_movimiento_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."registrar_movimiento_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."registrar_movimiento_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."resolver_discrepancia_ingreso"("p_id_discrepancia" bigint, "p_cantidad_final" integer, "p_motivo" "text", "p_evidencias" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."resolver_discrepancia_ingreso"("p_id_discrepancia" bigint, "p_cantidad_final" integer, "p_motivo" "text", "p_evidencias" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolver_discrepancia_ingreso"("p_id_discrepancia" bigint, "p_cantidad_final" integer, "p_motivo" "text", "p_evidencias" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."acceso_vehicular" TO "anon";
GRANT ALL ON TABLE "public"."acceso_vehicular" TO "authenticated";
GRANT ALL ON TABLE "public"."acceso_vehicular" TO "service_role";



GRANT ALL ON SEQUENCE "public"."acceso_vehicular_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."acceso_vehicular_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."acceso_vehicular_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."actas_recepcion" TO "anon";
GRANT ALL ON TABLE "public"."actas_recepcion" TO "authenticated";
GRANT ALL ON TABLE "public"."actas_recepcion" TO "service_role";



GRANT ALL ON SEQUENCE "public"."actas_recepcion_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."actas_recepcion_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."actas_recepcion_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ajustes_stock" TO "anon";
GRANT ALL ON TABLE "public"."ajustes_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."ajustes_stock" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ajustes_stock_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ajustes_stock_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ajustes_stock_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."alumnos" TO "anon";
GRANT ALL ON TABLE "public"."alumnos" TO "authenticated";
GRANT ALL ON TABLE "public"."alumnos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."alumnos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."alumnos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."alumnos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_recepcion_items" TO "anon";
GRANT ALL ON TABLE "public"."checklist_recepcion_items" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_recepcion_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."checklist_recepcion_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."checklist_recepcion_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."checklist_recepcion_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."checklists_recepcion" TO "anon";
GRANT ALL ON TABLE "public"."checklists_recepcion" TO "authenticated";
GRANT ALL ON TABLE "public"."checklists_recepcion" TO "service_role";



GRANT ALL ON SEQUENCE "public"."checklists_recepcion_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."checklists_recepcion_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."checklists_recepcion_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."detalle_distribuciones" TO "anon";
GRANT ALL ON TABLE "public"."detalle_distribuciones" TO "authenticated";
GRANT ALL ON TABLE "public"."detalle_distribuciones" TO "service_role";



GRANT ALL ON SEQUENCE "public"."detalle_distribuciones_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."detalle_distribuciones_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."detalle_distribuciones_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."detalle_ingresos" TO "anon";
GRANT ALL ON TABLE "public"."detalle_ingresos" TO "authenticated";
GRANT ALL ON TABLE "public"."detalle_ingresos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."detalle_ingresos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."detalle_ingresos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."detalle_ingresos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."discrepancias" TO "anon";
GRANT ALL ON TABLE "public"."discrepancias" TO "authenticated";
GRANT ALL ON TABLE "public"."discrepancias" TO "service_role";



GRANT ALL ON SEQUENCE "public"."discrepancias_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."discrepancias_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."discrepancias_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."distribuciones" TO "anon";
GRANT ALL ON TABLE "public"."distribuciones" TO "authenticated";
GRANT ALL ON TABLE "public"."distribuciones" TO "service_role";



GRANT ALL ON SEQUENCE "public"."distribuciones_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."distribuciones_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."distribuciones_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ingresos" TO "anon";
GRANT ALL ON TABLE "public"."ingresos" TO "authenticated";
GRANT ALL ON TABLE "public"."ingresos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ingresos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ingresos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ingresos_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."perfiles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."perfiles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."perfiles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."planes_distribucion" TO "anon";
GRANT ALL ON TABLE "public"."planes_distribucion" TO "authenticated";
GRANT ALL ON TABLE "public"."planes_distribucion" TO "service_role";



GRANT ALL ON SEQUENCE "public"."planes_distribucion_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."planes_distribucion_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."planes_distribucion_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."productos" TO "anon";
GRANT ALL ON TABLE "public"."productos" TO "authenticated";
GRANT ALL ON TABLE "public"."productos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."productos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."productos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."productos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."proveedores" TO "anon";
GRANT ALL ON TABLE "public"."proveedores" TO "authenticated";
GRANT ALL ON TABLE "public"."proveedores" TO "service_role";



GRANT ALL ON SEQUENCE "public"."proveedores_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."proveedores_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."proveedores_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."registro_movimientos" TO "anon";
GRANT ALL ON TABLE "public"."registro_movimientos" TO "authenticated";
GRANT ALL ON TABLE "public"."registro_movimientos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."registro_movimientos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."registro_movimientos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."registro_movimientos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."reportes" TO "anon";
GRANT ALL ON TABLE "public"."reportes" TO "authenticated";
GRANT ALL ON TABLE "public"."reportes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reportes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reportes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reportes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."respaldos_sistema" TO "anon";
GRANT ALL ON TABLE "public"."respaldos_sistema" TO "authenticated";
GRANT ALL ON TABLE "public"."respaldos_sistema" TO "service_role";



GRANT ALL ON SEQUENCE "public"."respaldos_sistema_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."respaldos_sistema_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."respaldos_sistema_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."stock" TO "anon";
GRANT ALL ON TABLE "public"."stock" TO "authenticated";
GRANT ALL ON TABLE "public"."stock" TO "service_role";



GRANT ALL ON SEQUENCE "public"."stock_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."stock_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."stock_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."v_usuarios" TO "anon";
GRANT ALL ON TABLE "public"."v_usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."v_usuarios" TO "service_role";



GRANT ALL ON TABLE "public"."vw_inventario_actual" TO "anon";
GRANT ALL ON TABLE "public"."vw_inventario_actual" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_inventario_actual" TO "service_role";



GRANT ALL ON TABLE "public"."vw_alertas_stock" TO "anon";
GRANT ALL ON TABLE "public"."vw_alertas_stock" TO "authenticated";
GRANT ALL ON TABLE "public"."vw_alertas_stock" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







