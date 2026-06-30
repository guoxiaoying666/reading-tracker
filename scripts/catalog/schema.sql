-- ============================================================
-- 好读·冷启动书单库 catalog_books 表
-- 用途：存储无需用户数据的系统推荐书单（多来源合并）
-- 创建时间：2026-06-25
-- ============================================================
-- 在 Supabase SQL Editor 中执行此脚本（Ctrl+Enter）

-- ===== 深度层级枚举约束 =====
DO $$ BEGIN
  CREATE TYPE catalog_depth AS ENUM ('入门层', '进阶层', '鉴赏层');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ===== 五维分类枚举（与 users 表一致但使用中文值） =====
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
  title text not null,                           -- 书名
  author text default '',                         -- 作者
  translator text default '',                     -- 译者
  publisher text default '',                      -- 出版社
  isbn text default '',                           -- ISBN

  -- 适龄区间（0 表示未知）
  age_min int default 0 check (age_min >= 0),
  age_max int default 0 check (age_max >= 0),

  -- 好读深度映射（按维度）
  dimension catalog_dimension default '文学叙事',  -- 五维分类（中文值）
  level2 text default '',                          -- 二级分类（如：绘本、小说、科普）
  depth_level catalog_depth default '入门层',      -- 入门层 / 进阶层 / 鉴赏层

  -- 来源与权重
  source_tag text[] default '{}',                  -- 多来源标签，如 {"国图四季童读","丹妈推荐"}
  source_weight int default 0,                     -- 最高来源权重分（排序用）

  -- 封面与描述
  cover_url text default '',                       -- 封面图片 URL
  description text default '',                     -- 简短推荐语 / 内容简介

  -- 元数据
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ===== 索引 =====

-- 按维度查询（最常用查询模式）
create index if not exists catalog_books_dimension_idx
  on catalog_books(dimension);

-- 按来源权重排序（推荐列表）
create index if not exists catalog_books_weight_idx
  on catalog_books(source_weight desc);

-- 按深度层级查询
create index if not exists catalog_books_depth_idx
  on catalog_books(depth_level);

-- 复合索引：维度 + 权重（推荐 API 核心查询）
create index if not exists catalog_books_dim_weight_idx
  on catalog_books(dimension, source_weight desc);

-- 书名去重合并查询
create index if not exists catalog_books_title_idx
  on catalog_books(title);

-- ===== 唯一约束（防止同书同作者重复入库） =====
-- 当 title + author 都非空时做唯一约束
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
