-- Private temporary storage for AI outfit analysis.
-- Apply this migration only to the intended Supabase project.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'outfit-analysis-temp',
  'outfit-analysis-temp',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do nothing;

drop policy if exists "Users can upload outfit analysis images" on storage.objects;
create policy "Users can upload outfit analysis images"
  on storage.objects
  for insert
  with check (
    bucket_id = 'outfit-analysis-temp'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can view outfit analysis images" on storage.objects;
create policy "Users can view outfit analysis images"
  on storage.objects
  for select
  using (
    bucket_id = 'outfit-analysis-temp'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete outfit analysis images" on storage.objects;
create policy "Users can delete outfit analysis images"
  on storage.objects
  for delete
  using (
    bucket_id = 'outfit-analysis-temp'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
