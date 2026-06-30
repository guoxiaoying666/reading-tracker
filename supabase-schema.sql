-- WondeRead — Supabase 数据库 Schema v2.0
-- 在 Supabase 的 SQL Editor 中执行（Ctrl+Enter）
-- 变更记录：
-- v2.0 2026-06: 新增dimension枚举约束、difficulty_avg、source_tag、is_foreign_classic
--               新增reading_records表、book_translation_maps表

-- ===== 扩展 =====
create extension if not exists pgcrypto;

-- ===== 五维分类枚举 =====
DO $$ BEGIN
  CREATE TYPE what_dimension AS ENUM ('narrative', 'science', 'humanity', 'art_create', 'self_growth');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

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

-- 手机号唯一索引（仅对非 null 的手机号生效）
drop index if exists profiles_phone_key cascade;
create unique index if not exists profiles_phone_unique on profiles(phone) where phone is not null;

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
  dimension what_dimension default 'narrative',        -- 五维分类（v2.0 枚举约束）
  level2 text default 'novel',
  level3 text default '',
  childStar integer default 0,
  note text default '',
  isbn text default '',
  cover_data text default '',
  -- v2.0 新增字段
  difficulty_avg real default null,                    -- 暂存用户反馈难度平均分
  source_tag text default '',                          -- 来源标签，如"国图推荐""老师推荐"
  is_foreign_classic boolean default false,            -- 是否触发译本推荐逻辑
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ===== 阅读记录表（v2.0 新增）=====
-- 每本书的每次阅读反馈记录
create table if not exists reading_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  book_id uuid references books(id) on delete cascade,
  -- v2.0 核心字段
  user_feedback_emoji text default '',                 -- 😄/😊/🤔/😖 四个值
  voice_audio_url text default '',                     -- 语音录音URL
  ai_processed_card jsonb default '{}',                -- AI三段式：{discovery, question, feeling}
  -- 元数据
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ===== 译本推荐缓存表（v2.0 新增）=====
-- 缓存后台/AI生成的译本推荐，避免重复调用DeepSeek
create table if not exists book_translation_maps (
  id uuid default gen_random_uuid() primary key,
  original_title text not null,                        -- 原版书名（查询key）
  author text default '',
  -- 推荐译本列表（JSON数组）
  top3 jsonb default '[]',                             -- [{translator, publish_year, recommend_reason}]
  source text default 'deepseek',                      -- deepseek / manual
  created_at timestamptz default now()
);

-- 唯一索引：同一书名+作者不重复缓存
create unique index if not exists book_translation_maps_uniq
  on book_translation_maps(original_title, author)
  where author is not null;

-- ===== 说说表（保留，v2.0 保持兼容）=====
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
  feedback_emoji text default '',                       -- 孩子阅读感受表情 😄/😊/🤔/😖
  user_voice text default '',                           -- 孩子的原话录音/文字
  created_at timestamptz default now()
);

-- 为 discoveries 追加新列（幂等，重启存量库时用）
alter table discoveries add column if not exists feedback_emoji text default '';
alter table discoveries add column if not exists user_voice text default '';

-- ===== 索引 =====
create index if not exists books_user_id_idx on books(user_id);
create index if not exists books_dimension_idx on books(dimension);
create index if not exists discoveries_user_id_idx on discoveries(user_id);
create index if not exists discoveries_book_id_idx on discoveries(book_id);
create index if not exists reading_records_user_id_idx on reading_records(user_id);
create index if not exists reading_records_book_id_idx on reading_records(book_id);


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

-- 注册正式用户（接受预计算的密码哈希，由 Node.js bcrypt 生成）
-- p_pin_hash 应为 bcrypt hash（以 $2 开头）
create or replace function register_user(p_phone text, p_pin_hash text, p_name text)
returns setof profiles
language plpgsql
security definer
as $$
begin
  return query
  insert into profiles (phone, pin_hash, name, is_anonymous)
  values (p_phone, p_pin_hash, p_name, false)
  returning *;
end;
$$;

-- 验证手机号和密码（登录用）
-- 返回手机号对应的用户，密码比对在 Node.js 层用 bcrypt 完成
create or replace function verify_pin(p_phone text, p_pin text)
returns setof profiles
language plpgsql
security definer
as $$
begin
  return query
  select id, phone, pin_hash, name, avatar_url, is_anonymous, created_at
  from profiles
  where phone = p_phone;
end;
$$;

-- 匿名用户升级为正式用户（绑定手机号+密码）
-- 如果手机号已被其他用户占用，返回空结果
-- p_pin_hash 应为 bcrypt hash（以 $2 开头）
create or replace function upgrade_user(p_user_uuid uuid, p_phone text, p_pin_hash text)
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
      pin_hash = p_pin_hash,
      is_anonymous = false
  where id = p_user_uuid
  returning *;
end;
$$;

-- ===== 迁移脚本（仅首次执行）=====
-- 为现有已绑定手机号的用户设置 is_anonymous = false
update profiles set is_anonymous = false where phone is not null and is_anonymous = true;

-- ============================================================
-- v3.0 2026-06: 冷启动书单库 catalog_books 表
-- ============================================================

-- ===== 深度层级枚举 =====
DO $$ BEGIN
  CREATE TYPE catalog_depth AS ENUM ('入门层', '进阶层', '鉴赏层');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ===== 五维分类枚举（中文值）=====
DO $$ BEGIN
  CREATE TYPE catalog_dimension AS ENUM (
    '文学叙事', '自然科学', '人文社会', '艺术创想', '自我成长'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ===== catalog_books 主表 =====
create table if not exists catalog_books (
  id uuid default gen_random_uuid() primary key,

  -- 书籍身份信息
  title text not null,
  author text default '',
  translator text default '',
  publisher text default '',
  isbn text default '',

  -- 适龄区间
  age_min int default 0 check (age_min >= 0),
  age_max int default 0 check (age_max >= 0),

  -- 好读深度映射
  dimension catalog_dimension default '文学叙事',
  level2 text default '',
  depth_level catalog_depth default '入门层',

  -- 来源与权重
  source_tag text[] default '{}',
  source_weight int default 0,

  -- 封面与描述
  cover_url text default '',
  description text default '',

  -- 元数据
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ===== 索引 =====
create index if not exists catalog_books_dimension_idx on catalog_books(dimension);
create index if not exists catalog_books_weight_idx on catalog_books(source_weight desc);
create index if not exists catalog_books_depth_idx on catalog_books(depth_level);
create index if not exists catalog_books_dim_weight_idx on catalog_books(dimension, source_weight desc);
create index if not exists catalog_books_title_idx on catalog_books(title);
create unique index if not exists catalog_books_title_author_uniq
  on catalog_books(lower(trim(title)), lower(trim(author)))
  where title != '' and author != '';

-- ===== 更新触发器 =====
create or replace function update_catalog_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_catalog_books_updated_at on catalog_books;
create trigger trigger_catalog_books_updated_at
  before update on catalog_books
  for each row execute function update_catalog_timestamp();
