-- ============================================================
-- Corrección completa del módulo de usuarios
-- ============================================================
-- Problema raíz: las migraciones anteriores intentaban insertar
-- "email" en public.perfiles, columna que no existe. El email
-- vive en auth.users y se expone mediante una vista segura.
-- ============================================================


-- 1. Corregir trigger: eliminar referencia a email (columna inexistente)
CREATE OR REPLACE FUNCTION public.crear_perfil_desde_auth()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
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


-- 2. Función principal de creación de usuarios
--    - Sin email en perfiles (columna no existe)
--    - Usa extensions.crypt / extensions.gen_salt (pgcrypto en Supabase)
CREATE OR REPLACE FUNCTION public.crear_usuario_completo(
  p_email           text,
  p_nombre_completo text,
  p_dni             text    DEFAULT NULL,
  p_telefono        text    DEFAULT NULL,
  p_rol             text    DEFAULT 'almacen',
  p_activo          boolean DEFAULT true,
  p_id_alumno       bigint  DEFAULT NULL
)
  RETURNS public.perfiles
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
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

REVOKE ALL ON FUNCTION public.crear_usuario_completo(text,text,text,text,text,boolean,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_usuario_completo(text,text,text,text,text,boolean,bigint) TO authenticated;


-- 3. Vista v_usuarios: expone perfiles + email de auth.users
--    security_invoker = false → corre como owner (postgres), que puede
--    leer auth.users sin restricciones de RLS.
DROP VIEW IF EXISTS public.v_usuarios;

CREATE VIEW public.v_usuarios
WITH (security_invoker = false)
AS
SELECT
  p.id,
  p.id_usuario_auth,
  u.email,
  p.nombre_completo,
  p.telefono,
  p.dni,
  p.id_alumno,
  p.rol,
  p.activo,
  p.creado_en,
  p.actualizado_en
FROM public.perfiles p
LEFT JOIN auth.users u ON u.id = p.id_usuario_auth;

GRANT SELECT ON public.v_usuarios TO authenticated;
