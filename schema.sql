-- ============================================================================
-- Batify — Supabase schema. Paste into the Supabase SQL editor and run once.
-- Safe to re-run (idempotent where possible).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

create table if not exists public.pages (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  edit_token          text unique not null,            -- 32-char random; replaces auth
  owner_name          text not null,
  title               text not null,
  letter              text not null,
  birthday_date       date not null,
  theme               text default 'confetti',
  reveal_at           timestamptz,                     -- wishes locked until this time
  auto_approve_wishes boolean default false,
  gcash_number        text,
  gcash_qr_url        text,
  is_published        boolean default true,
  created_at          timestamptz default now()
);
create index if not exists pages_edit_token_idx on public.pages (edit_token);

create table if not exists public.wishes (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid references public.pages(id) on delete cascade,
  sender_name text not null,
  message     text,
  gift_type   text not null,                           -- 'flower' | 'teddy' | 'chocolate' | 'media'
  media_url   text,
  media_type  text,                                    -- 'image' | 'video'
  is_approved boolean default false,
  created_at  timestamptz default now()
);
create index if not exists wishes_page_created_idx on public.wishes (page_id, created_at desc);

create table if not exists public.contributions (
  id          uuid primary key default gen_random_uuid(),
  wish_id     uuid references public.wishes(id) on delete cascade,   -- nullable: standalone GCash gifts
  page_id     uuid references public.pages(id) on delete cascade,
  sender_name text,                                    -- added vs. original spec: who sent it
  amount      numeric(10,2) not null,
  currency    text default 'PHP',
  method      text default 'gcash',
  proof_url   text,                                    -- path in private "payment-proofs" bucket
  status      text default 'pending',                  -- 'pending' | 'paid'
  created_at  timestamptz default now()
);
create index if not exists contributions_page_idx on public.contributions (page_id, created_at desc);

create table if not exists public.reports (
  id         uuid primary key default gen_random_uuid(),
  wish_id    uuid references public.wishes(id) on delete cascade,
  reason     text,
  created_at timestamptz default now()
);
create index if not exists reports_wish_idx on public.reports (wish_id);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- All writes happen in Edge Functions using the service_role key (bypasses RLS).
-- The anon / authenticated roles can ONLY read published pages + approved wishes.
-- ---------------------------------------------------------------------------

alter table public.pages         enable row level security;
alter table public.wishes        enable row level security;
alter table public.contributions enable row level security;
alter table public.reports       enable row level security;

drop policy if exists pages_public_read on public.pages;
create policy pages_public_read on public.pages
  for select to anon, authenticated
  using (is_published = true);

-- Stronger than the bare "is_approved = true" rule: wishes stay hidden at the
-- API level (not just in the UI) until the page's reveal_at has passed, so the
-- time-lock cannot be bypassed by calling the REST API directly.
drop policy if exists wishes_public_read on public.wishes;
create policy wishes_public_read on public.wishes
  for select to anon, authenticated
  using (
    is_approved = true
    and exists (
      select 1 from public.pages p
      where p.id = wishes.page_id
        and p.is_published = true
        and (p.reveal_at is null or p.reveal_at <= now())
    )
  );

-- contributions + reports: NO policies at all => anon can read nothing.

-- ---------------------------------------------------------------------------
-- PRIVILEGE HARDENING
-- RLS filters ROWS, not COLUMNS. Without this, anon could `select edit_token`
-- from pages and hijack every page. So: revoke everything, then grant SELECT
-- only on the safe columns. (Clients must therefore list columns explicitly —
-- `select *` on pages will fail for anon by design.)
-- ---------------------------------------------------------------------------

revoke all on public.pages         from anon, authenticated;
revoke all on public.wishes        from anon, authenticated;
revoke all on public.contributions from anon, authenticated;
revoke all on public.reports       from anon, authenticated;

grant select (
  id, slug, owner_name, title, letter, birthday_date, theme, reveal_at,
  auto_approve_wishes, gcash_number, gcash_qr_url, is_published, created_at
) on public.pages to anon, authenticated;

grant select on public.wishes to anon, authenticated;

-- ---------------------------------------------------------------------------
-- REALTIME — let the public page receive new / newly-approved wishes live.
-- (Realtime honours the RLS policy above.)
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wishes'
  ) then
    alter publication supabase_realtime add table public.wishes;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- STORAGE
-- wish-media      : PUBLIC bucket, gift photos/videos + GCash QR images (25 MB)
-- payment-proofs  : PRIVATE bucket, sender payment screenshots (10 MB).
--                   Only the service role can read; the owner dashboard gets
--                   short-lived signed URLs from the manage-page function.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wish-media', 'wish-media', true, 26214400,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs', 'payment-proofs', false, 10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "wish-media public read" on storage.objects;
create policy "wish-media public read" on storage.objects
  for select using (bucket_id = 'wish-media');

-- No storage policies for anon writes, and none for payment-proofs at all.
