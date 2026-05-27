-- Actualiza el trigger para que también persista el email del auth user.
-- Antes solo guardaba id_usuario_auth, rol, nombre_completo y activo.
CREATE OR REPLACE FUNCTION public.crear_perfil_desde_auth()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_role text;
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
    email,
    rol,
    nombre_completo,
    activo
  ) VALUES (
    new.id,
    new.email,
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


-- Función principal: crea el usuario en auth.users + perfil completo en una
-- sola transacción server-side. El admin que llama mantiene su sesión activa.
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

  -- Insertar en auth.users (bypasa signUp del cliente, no afecta sesión activa)
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
    crypt('admin123', gen_salt('bf')),
    now(),  -- confirmado de inmediato, sin necesidad de verificar email
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre_completo', p_nombre_completo, 'rol', p_rol),
    now(),
    now(),
    '', '', '', ''
  );

  -- Insertar identity para provider email (necesario para que el login funcione)
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

  -- El trigger crear_perfil_desde_auth ya insertó el perfil con datos básicos.
  -- Hacemos upsert para sobreescribir con los datos completos.
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
    email          = EXCLUDED.email,
    nombre_completo = EXCLUDED.nombre_completo,
    dni            = EXCLUDED.dni,
    telefono       = EXCLUDED.telefono,
    rol            = EXCLUDED.rol,
    activo         = EXCLUDED.activo,
    id_alumno      = EXCLUDED.id_alumno
  RETURNING * INTO v_perfil;

  RETURN v_perfil;
END;
$$;

-- Permisos: solo usuarios autenticados pueden ejecutarla
-- (la función ya valida internamente que sea admin/director)
REVOKE ALL ON FUNCTION public.crear_usuario_completo(text,text,text,text,text,boolean,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_usuario_completo(text,text,text,text,text,boolean,bigint) TO authenticated;
