-- 好读 · 飞书阅读机器人：对话会话表
-- 在 Supabase 的 SQL Editor 中执行一次。
-- 只有服务端（service role key）能读写，前端的 anon key 读不到孩子的对话。

create table if not exists feishu_sessions (
  chat_id     text primary key,
  book_title  text default '',
  messages    jsonb not null default '[]'::jsonb,
  closing     boolean not null default false,
  flagged     boolean not null default false,
  updated_at  timestamptz not null default now()
);

alter table feishu_sessions enable row level security;
-- 故意不建任何 policy：anon / authenticated 角色一律无权访问。
revoke all on feishu_sessions from anon, authenticated;
