-- Backfill: poblar email en perfiles para usuarios ya existentes
-- que fueron creados antes de que el trigger guardara el email.
UPDATE public.perfiles p
SET email = u.email
FROM auth.users u
WHERE p.id_usuario_auth = u.id
  AND (p.email IS NULL OR p.email = '');


-- Recrear la función con el prefijo extensions. para crypt/gen_salt.
-- Supabase ubica pgcrypto en el schema "extensions", no en "public",
-- por lo que SET search_path = public no las encuentra.
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
  -- Solo administradores y directores pueden crear usuarios
  SELECT rol INTO v_caller_rol
  FROM public.perfiles
  WHERE id_usuario_auth = auth.uid();

  IF v_caller_rol NOT IN ('administrador', 'director') THEN
    RAISE EXCEPTION 'Permiso denegado: solo administradores pueden crear usuarios';
  END IF;

  -- Validar rol
  IF p_rol NOT IN (
    'administrador', 'director', 'cae', 'almacen',
    'docente', 'operario_logistico', 'padre_familia'
  ) THEN
    RAISE EXCEPTION 'Rol inválido: %', p_rol;
  END IF;

  -- Verificar duplicado de email
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(trim(p_email))) THEN
    RAISE EXCEPTION 'Ya existe un usuario con el correo %', p_email;
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
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
    now(),
    now(),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    lower(trim(p_email)),
    jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(p_email))),
    'email',
    now(),
    now(),
    now()
  );

  INSERT INTO public.perfiles (
    id_usuario_auth,
    email,
    nombre_completo,
    dni,
    telefono,
    rol,
    activo,
    id_alumno
  ) VALUES (
    v_user_id,
    lower(trim(p_email)),
    p_nombre_completo,
    nullif(trim(coalesce(p_dni, '')), ''),
    nullif(trim(coalesce(p_telefono, '')), ''),
    p_rol,
    p_activo,
    p_id_alumno
  )
  ON CONFLICT (id_usuario_auth) DO UPDATE SET
    email           = EXCLUDED.email,
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
