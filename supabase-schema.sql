-- 伊伊的书房 — Supabase 数据库 Schema
-- 在 Supabase 的 SQL Editor 中执行（Ctrl+Enter）

-- ===== 扩展 =====
create extension if not exists pgcrypto;

-- ===== 用户表（profiles）=====
-- profiles.id = user_uuid，无论是匿名还是正式用户都有 UUID
create table if not exists profiles (
  id uuid default gen_random_uuid() primary key,
  phone text,                          -- 正式用户绑定手机号，匿名用户为 null
  pin_hash text,                       -- SHA256 密码，匿名用户为 null
  name text default '',
  avatar_url text default '',
  is_anonymous boolean default true,   -- true=匿名，false=绑定手机号的正式用户
  created_at timestamptz default now()
);

-- 手机号唯一索引（仅对非 null 的手机号生效，允许多个匿名用户 phone=null）
-- 注意：如果之前已存在 phone unique 约束（not null），需要先删掉旧的
drop index if exists profiles_phone_key cascade;
create unique index if not exists profiles_phone_unique on profiles(phone) where phone is not null;

-- ===== 书籍表 =====
create table if not exists books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,  -- 引用 profiles.id（即 user_uuid）
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


-- ============================================================
-- 以下为 RPC 函数（security definer，绕过行级安全 RLS）
-- ============================================================

-- 创建匿名用户（指定 UUID，前端 localStorage 生成）
create or replace function create_anonymous_user(p_user_uuid uuid)
returns setof profiles
language plpgsql
security definer
as $$
begin
  return query
  insert into profiles (id, name, is_anonymous)
  values (p_user_uuid, '访客', true)
  returning *;
end;
$$;

-- 通过 UUID 查询用户（判断是否存在）
create or replace function get_user_by_uuid(p_user_uuid uuid)
returns setof profiles
language plpgsql
security definer
as $$
begin
  return query select * from profiles where id = p_user_uuid;
end;
$$;

-- 检查手机号是否已被绑定
create or replace function check_phone_bound(p_phone text)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists(select 1 from profiles where phone = p_phone);
end;
$$;

-- 注册正式用户（带手机号+密码）
create or replace function register_user(p_phone text, p_pin text, p_name text)
returns setof profiles
language plpgsql
security definer
as $$
begin
  return query
  insert into profiles (phone, pin_hash, name, is_anonymous)
  values (p_phone, encode(digest(p_pin, 'sha256'), 'hex'), p_name, false)
  returning *;
end;
$$;

-- 验证手机号和密码（登录用）
create or replace function verify_pin(p_phone text, p_pin text)
returns setof profiles
language plpgsql
security definer
as $$
begin
  return query
  select id, phone, pin_hash, name, avatar_url, is_anonymous, created_at
  from profiles
  where phone = p_phone and pin_hash = encode(digest(p_pin, 'sha256'), 'hex');
end;
$$;

-- 匿名用户升级为正式用户（绑定手机号+密码）
-- 如果手机号已被其他用户占用，返回空结果
create or replace function upgrade_user(p_user_uuid uuid, p_phone text, p_pin text)
returns setof profiles
language plpgsql
security definer
as $$
begin
  -- 检查手机号是否已被其他用户绑定
  if exists(select 1 from profiles where phone = p_phone and id != p_user_uuid) then
    return;
  end if;

  return query
  update profiles
  set phone = p_phone,
      pin_hash = encode(digest(p_pin, 'sha256'), 'hex'),
      is_anonymous = false
  where id = p_user_uuid
  returning *;
end;
$$;

-- ===== 迁移脚本（仅首次执行）=====
-- 为现有已绑定手机号的用户设置 is_anonymous = false
update profiles set is_anonymous = false where phone is not null and is_anonymous = true;
