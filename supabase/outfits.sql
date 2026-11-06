-- Outfit documentation MVP schema and owner-scoped policies.
-- Review and apply this migration in the Supabase SQL Editor.

create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_path text not null,
  worn_on date not null default current_date,
  title text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.outfit_items (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references public.outfits(id) on delete cascade,
  clothing_item_id uuid not null references public.clothing_items(id),
  source text not null default 'manual' check (source in ('manual', 'ai')),
  created_at timestamptz not null default now(),
  unique (outfit_id, clothing_item_id)
);

create index if not exists outfits_user_id_idx
  on public.outfits(user_id);

create index if not exists outfits_worn_on_idx
  on public.outfits(worn_on desc);

create index if not exists outfit_items_outfit_id_idx
  on public.outfit_items(outfit_id);

create index if not exists outfit_items_clothing_item_id_idx
  on public.outfit_items(clothing_item_id);

alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;

create policy "Users can view own outfits"
  on public.outfits
  for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert own outfits"
  on public.outfits
  for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own outfits"
  on public.outfits
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own outfits"
  on public.outfits
  for delete
  using ((select auth.uid()) = user_id);

create policy "Users can view own outfit items"
  on public.outfit_items
  for select
  using (
    exists (
      select 1
      from public.outfits
      where outfits.id = outfit_items.outfit_id
        and outfits.user_id = (select auth.uid())
    )
  );

create policy "Users can insert own outfit items"
  on public.outfit_items
  for insert
  with check (
    exists (
      select 1
      from public.outfits
      where outfits.id = outfit_items.outfit_id
        and outfits.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.clothing_items
      where clothing_items.id = outfit_items.clothing_item_id
        and clothing_items.user_id = (select auth.uid())
    )
  );

create policy "Users can update own outfit items"
  on public.outfit_items
  for update
  using (
    exists (
      select 1
      from public.outfits
      where outfits.id = outfit_items.outfit_id
        and outfits.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.outfits
      where outfits.id = outfit_items.outfit_id
        and outfits.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.clothing_items
      where clothing_items.id = outfit_items.clothing_item_id
        and clothing_items.user_id = (select auth.uid())
    )
  );

create policy "Users can delete own outfit items"
  on public.outfit_items
  for delete
  using (
    exists (
      select 1
      from public.outfits
      where outfits.id = outfit_items.outfit_id
        and outfits.user_id = (select auth.uid())
    )
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'outfit-images',
  'outfit-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do nothing;

create policy "Users can view own outfit images"
  on storage.objects
  for select
  using (
    bucket_id = 'outfit-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can upload own outfit images"
  on storage.objects
  for insert
  with check (
    bucket_id = 'outfit-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update own outfit images"
  on storage.objects
  for update
  using (
    bucket_id = 'outfit-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'outfit-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete own outfit images"
  on storage.objects
  for delete
  using (
    bucket_id = 'outfit-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
