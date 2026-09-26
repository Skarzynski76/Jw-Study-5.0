-- ==============================================================================
-- JW-Study Supabase Synchronization Schema
-- Instrukcja:
-- 1. Otwórz panel Supabase (https://app.supabase.com)
-- 2. Wybierz swój projekt -> SQL Editor -> New Query
-- 3. Wklej poniższy kod i kliknij "Run"
-- ==============================================================================

-- 1. Włączenie rozszerzenia UUID
create extension if not exists "uuid-ossp";

-- 2. Tabela Notatek (notes)
create table if not exists public.notes (
    user_id uuid not null references auth.users(id) on delete cascade,
    guid text not null,
    title text,
    data jsonb not null,
    updated_at timestamptz not null default now(),
    is_deleted boolean not null default false,
    primary key (user_id, guid)
);

-- Indeksy dla szybkiego pobierania zmian (delta sync)
create index if not exists idx_notes_user_updated on public.notes (user_id, updated_at desc);
create index if not exists idx_notes_user_guid on public.notes (user_id, guid);

-- 3. Tabela Etykiet (tags)
create table if not exists public.tags (
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    data jsonb not null,
    updated_at timestamptz not null default now(),
    is_deleted boolean not null default false,
    primary key (user_id, name)
);

create index if not exists idx_tags_user_updated on public.tags (user_id, updated_at desc);

-- 4. Tabela Metadanych Aplikacji (app_meta)
-- Zawiera: sections, pubTabs, secTabs, szablony, autoTopics
create table if not exists public.app_meta (
    user_id uuid not null references auth.users(id) on delete cascade,
    key text not null,
    data jsonb not null,
    updated_at timestamptz not null default now(),
    primary key (user_id, key)
);

create index if not exists idx_app_meta_user_updated on public.app_meta (user_id, updated_at desc);

-- 5. Bezpieczeństwo i izolacja użytkowników (Row Level Security - RLS)
-- Każdy zalogowany użytkownik ma dostęp wyłącznie do swoich własnych danych
alter table public.notes enable row level security;
alter table public.tags enable row level security;
alter table public.app_meta enable row level security;

-- Polityki dla notes
drop policy if exists "Users manage their own notes" on public.notes;
create policy "Users manage their own notes"
    on public.notes
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Polityki dla tags
drop policy if exists "Users manage their own tags" on public.tags;
create policy "Users manage their own tags"
    on public.tags
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Polityki dla app_meta
drop policy if exists "Users manage their own app_meta" on public.app_meta;
create policy "Users manage their own app_meta"
    on public.app_meta
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
