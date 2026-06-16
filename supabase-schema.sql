-- 伊伊的书房 — Supabase 数据库 Schema
-- 在 Supabase 的 SQL Editor 中执行（Ctrl+Enter）

-- ===== 扩展 =====
create extension if not exists pgcrypto;

-- ===== 用户表 =====
create table if not exists profiles (
  id uuid default gen_random_uuid() primary key,
  phone text unique not null,
  pin_hash text not null,
  name text default '',
  avatar_url text default '',
  created_at timestamptz default now()
);

-- ===== 书籍表 =====
create table if not exists books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  title text not null,
  author text default '',
  translator text default '',
  month text default '',
  source text default '',
  language text default '外文',
  classic boolean default false,
  fiction text default '虚构',
  dimension text default 'literature',
  level2 text default 'novel',
  level3 text default '',
  childStar integer default 0,
  note text default '',
  isbn text default '',
  cover_data text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ===== 说说表 =====
create table if not exists discoveries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  book_id uuid references books(id) on delete cascade,
  book_title text default '',
  discovery text default '',
  question text default '',
  quote text default '',
  original text default '',
  date text default '',
  created_at timestamptz default now()
);

-- ===== 索引 =====
create index if not exists books_user_id_idx on books(user_id);
create index if not exists discoveries_user_id_idx on discoveries(user_id);
create index if not exists discoveries_book_id_idx on discoveries(book_id);

-- ===== 注册函数 =====
create or replace function register_user(p_phone text, p_pin text, p_name text)
returns setof profiles
language plpgsql
security definer
as $$
begin
  return query
  insert into profiles (phone, pin_hash, name)
  values (p_phone, encode(digest(p_pin, 'sha256'), 'hex'), p_name)
  returning *;
end;
$$;

-- ===== 验证函数 =====
create or replace function verify_pin(p_phone text, p_pin text)
returns setof profiles
language plpgsql
security definer
as $$
begin
  return query
  select id, phone, pin_hash, name, avatar_url, created_at
  from profiles
  where phone = p_phone and pin_hash = encode(digest(p_pin, 'sha256'), 'hex');
end;
$$;

-- ===== 检查手机号是否存在 =====
create or replace function check_phone_exists(p_phone text)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists(select 1 from profiles where phone = p_phone);
end;
$$;
