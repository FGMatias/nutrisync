-- Storage para actas de recepcion en PDF
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'actas-recepcion',
  'actas-recepcion',
  false,
  5242880,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Limpieza idempotente de politicas previas
drop policy if exists "actas_recepcion_storage_select" on storage.objects;
drop policy if exists "actas_recepcion_storage_insert" on storage.objects;
drop policy if exists "actas_recepcion_storage_update" on storage.objects;
drop policy if exists "actas_recepcion_storage_delete" on storage.objects;

-- Lectura: roles operativos y de supervision
create policy "actas_recepcion_storage_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'actas-recepcion'
  and exists (
    select 1
    from public.perfiles p
    where p.id_usuario_auth = auth.uid()
      and p.rol in ('administrador', 'director', 'cae', 'almacen')
  )
);

-- Escritura: solo almacen y administrador
create policy "actas_recepcion_storage_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'actas-recepcion'
  and exists (
    select 1
    from public.perfiles p
    where p.id_usuario_auth = auth.uid()
      and p.rol in ('administrador', 'almacen')
  )
);

create policy "actas_recepcion_storage_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'actas-recepcion'
  and exists (
    select 1
    from public.perfiles p
    where p.id_usuario_auth = auth.uid()
      and p.rol in ('administrador', 'almacen')
  )
)
with check (
  bucket_id = 'actas-recepcion'
  and exists (
    select 1
    from public.perfiles p
    where p.id_usuario_auth = auth.uid()
      and p.rol in ('administrador', 'almacen')
  )
);

create policy "actas_recepcion_storage_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'actas-recepcion'
  and exists (
    select 1
    from public.perfiles p
    where p.id_usuario_auth = auth.uid()
      and p.rol in ('administrador', 'almacen')
  )
);
