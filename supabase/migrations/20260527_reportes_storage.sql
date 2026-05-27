-- Storage para modulo de reportes
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reportes',
  'reportes',
  false,
  15728640,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "reportes_storage_select" on storage.objects;
drop policy if exists "reportes_storage_insert" on storage.objects;
drop policy if exists "reportes_storage_update" on storage.objects;
drop policy if exists "reportes_storage_delete" on storage.objects;

create policy "reportes_storage_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'reportes'
  and exists (
    select 1
    from public.perfiles p
    where p.id_usuario_auth = auth.uid()
      and p.rol in ('administrador', 'director', 'cae')
  )
);

create policy "reportes_storage_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'reportes'
  and exists (
    select 1
    from public.perfiles p
    where p.id_usuario_auth = auth.uid()
      and p.rol in ('administrador', 'director', 'cae')
  )
);

create policy "reportes_storage_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'reportes'
  and exists (
    select 1
    from public.perfiles p
    where p.id_usuario_auth = auth.uid()
      and p.rol in ('administrador', 'director', 'cae')
  )
)
with check (
  bucket_id = 'reportes'
  and exists (
    select 1
    from public.perfiles p
    where p.id_usuario_auth = auth.uid()
      and p.rol in ('administrador', 'director', 'cae')
  )
);

create policy "reportes_storage_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'reportes'
  and exists (
    select 1
    from public.perfiles p
    where p.id_usuario_auth = auth.uid()
      and p.rol in ('administrador', 'director', 'cae')
  )
);
