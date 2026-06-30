-- ============================================================
-- 好读 WondeRead — 管理后台 v1.0 数据库迁移
-- 目标：为 profiles 增加 role 字段，创建管理员 RPC 函数
-- 在 Supabase SQL Editor 中执行（Ctrl+Enter）
-- ============================================================

-- 1. 给 profiles 表加 role 字段（默认 'user'）
alter table profiles add column if not exists role text default 'user';

-- 2. 检查用户是否为管理员（RPC）
create or replace function check_is_admin(p_user_uuid uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists(select 1 from profiles where id = p_user_uuid and role = 'admin');
end;
$$;

-- 3. 获取管理后台统计概览（RPC）
create or replace function get_admin_stats()
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  select json_build_object(
    'total_users',       (select count(*) from profiles),
    'registered_users',  (select count(*) from profiles where is_anonymous = false),
    'anonymous_users',   (select count(*) from profiles where is_anonymous = true),
    'total_books',       (select count(*) from books),
    'dimension_breakdown', coalesce((
      select json_agg(json_build_object('dimension', dimension, 'count', cnt) order by cnt desc)
      from (select dimension, count(*)::int as cnt from books group by dimension) sub
    ), '[]'::json),
    'recent_registrations', (select count(*) from profiles where created_at > now() - interval '7 days')
  ) into result;
  return result;
end;
$$;

-- 4. 获取所有用户列表含藏书量（RPC）
create or replace function get_admin_users()
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  select coalesce(json_agg(sub order by sub.created_at desc), '[]'::json)
  into result
  from (
    select
      p.id, p.phone, p.name, p.is_anonymous, p.role, p.created_at,
      (select count(*)::int from books where user_id = p.id) as book_count
    from profiles p
  ) sub;
  return result;
end;
$$;

-- 5. 设置你自己为管理员（重要！把 'your-phone-number' 换成你的手机号）
-- 取消注释下面这行并执行：
-- update profiles set role = 'admin' where phone = 'your-phone-number';

-- 或者通过 UUID 设置（从 localStorage 的 reading-tracker-user 中查看 user_uuid）：
-- update profiles set role = 'admin' where id = 'your-uuid-here';
