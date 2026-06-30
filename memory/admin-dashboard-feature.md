---
name: admin-dashboard-feature
description: 管理后台功能 — 用户列表 + 数据概览
---

建立了管理后台系统：
- 数据库 `profiles` 表增加 `role` 字段（默认 `'user'`，管理员设为 `'admin'`）
- 3 个 Supabase RPC 函数：`check_is_admin`、`get_admin_stats`、`get_admin_users`
- API 端点 `POST /api/admin`（`actions: check | stats | users`）
- 前端 `AdminDashboard` 组件：数据概览卡片 + 五维分布图 + 用户列表
- 入口：Header 下拉菜单 → 🔧 管理后台（仅登录用户可见，数据仅管理员可看）
