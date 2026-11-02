# Supabase 迁移设置指南

前端已改为直连 Supabase（Auth + Postgres + Storage）。Mongo/Express 后端可停用。

## 1. 创建项目

1. 打开 [https://supabase.com](https://supabase.com) 新建项目  
2. 记下 **Project URL** 和 **anon public key**（Settings → API）

## 2. 运行数据库脚本

1. Dashboard → **SQL Editor** → New query  
2. 粘贴并执行：`supabase/migrations/001_initial_schema.sql`  
3. 确认无报错（Storage 策略若已存在可忽略冲突）

## 3. 配置 Auth

**Authentication → Providers → Email**

- 开启 Email  
- **请开启 Confirm email**（注册后点邮件里的确认链接）  
- **关掉 Custom SMTP**（用 Supabase 自带免费发信；无域名时不要用 Resend）  
- Site URL：`http://localhost:4000`  
- Redirect URLs 加上：
  - `http://localhost:4000/**`
  - `http://localhost:4000/login`
  - `http://localhost:4000/reset-password`

**自带免费发信限制**

- 只能发给 **组织 Team 成员邮箱**  
- 大约每小时 2 封  
- 自定义模板可能锁着——**用默认 Confirm sign up 模板即可**（含确认链接）

前端流程：
1. 注册后显示「Check your email」  
2. 用户点邮件里的 Confirm → 回到 `/login`，自动完成会话并写入 Welcome 通知  
3. 之后用邮箱密码正常登录  

漂亮版链接模板（有域名 + Custom SMTP 后再用）：`docs/email-templates/confirm-signup.html`

### 方案 B（可选）：有域名后再用 Resend

需要给任意邮箱发确认信、改自定义模板时再开。须先在 Resend **验证你拥有的域名**，再填 SMTP：

| 字段 | 填什么 |
|------|--------|
| Sender email | `noreply@你的已验证域名` |
| Sender name | `AH HAO PET SHOP` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Resend API Key（`re_xxxx`） |

然后把 `docs/email-templates/confirm-signup.html`（含 `{{ .ConfirmationURL }}`）贴进 Confirm sign up → Save。

## 4. 前端环境变量

在项目根目录复制：

```bash
copy .env.example .env.local
```

填入：

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

然后重启：

```bash
npm run dev
```

## 5. 创建管理员

1. 先用网站注册一个账号（或 Auth → Users → Add user）  
2. SQL Editor 执行（把邮箱换成你的）：

```sql
update public.profiles
set role = 'admin'
where email = 'your-admin@email.com';
```

之后用该账号登录即可进 `/admin-portal`。

## 6. Storage

脚本会创建公开桶 `pet-images`。若失败，到 **Storage → New bucket** 手动建 `pet-images`（Public）。

## 7. 旧 Mongo 数据

- 本地没有 `.env` / 忘记 Atlas 密码时，旧数据无法自动导入  
- Atlas：重置 Database User 密码后可用导出脚本再手工导入  
- 新项目可从零录入店铺宠物与会员

## 8. 已迁移功能对照

| 功能 | 状态 |
|------|------|
| 注册 / 登录 / 重置密码 | Supabase Auth |
| 会员资料 / 角色 | `profiles` |
| 会员宠物 | `pets` |
| 店铺宠物 + 图片 | `shop_pets` + Storage |
| 预约 / 时段 | `appointments` + RPC |
| 美容 / 日托 | seed + admin CRUD |
| 收藏 / 通知 | `favourites` / `notifications` |
| Admin Portal | RLS `is_admin()` |
| 旧 Express / Mongo / `frontend/` | **已从仓库删除** |

店铺宠物种子数据：再执行 `supabase/migrations/003_seed_shop_pets.sql`

## 9. 防止免费项目闲置暂停（每 3 天 ping）

免费 Supabase 大约 **7 天无活动会 pause**。仓库里已加 GitHub Action：
`.github/workflows/keep-supabase-alive.yml`（每 3 天自动访问一次）。

### 用 GitHub Actions（推荐）

1. 先把项目推到 GitHub（当前本地还没有 git remote）  
2. GitHub 仓库 → **Settings → Secrets and variables → Actions**，新增：
   - `SUPABASE_URL` = `https://你的项目.supabase.co`（同 `.env.local` 的 `VITE_SUPABASE_URL`）
   - `SUPABASE_ANON_KEY` = anon key（同 `VITE_SUPABASE_ANON_KEY`）  
3. **Actions → Keep Supabase alive → Run workflow** 测一次  
4. 之后会按 cron 每 3 天跑（免费 GitHub 上 schedule 可能略延迟，3 天间隔通常够用）

### 用 UptimeRobot（立刻可用，推荐）

1. 打开 [UptimeRobot](https://uptimerobot.com) 注册 / 登录  
2. **Add New Monitor**  
3. 填：
   - **Monitor Type**：`HTTP(s)`
   - **Friendly Name**：`Ah Hao Supabase keep-alive`（随意）
   - **URL**：`https://你的项目.supabase.co/auth/v1/health`  
     （同 `.env.local` 的 `VITE_SUPABASE_URL` + `/auth/v1/health`）
   - **Monitoring Interval**：免费版最短约 **5 分钟**（比 3 天更勤，一样能防 pause，没问题）
4. 可选 **HTTP Headers**：加一行  
   `apikey:你的_VITE_SUPABASE_ANON_KEY`  
   （多数情况 health 不强制，加了更稳）
5. Create Monitor → 等第一次变绿即可  

### 其它定时服务

也可用 [cron-job.org](https://cron-job.org)：同一 health URL，间隔设每 3 天。

## 故障排查

- 控制台提示 Missing `VITE_SUPABASE_*` → 检查 `.env.local` 并重启 Vite  
- `row-level security` 拒绝 → 确认已登录，或 admin 的 `profiles.role = 'admin'`  
- 注册没有确认邮件 → Confirm email = ON；关掉 Custom SMTP；收件邮箱必须是 Team 成员；查 Inbox/Spam  
- 点确认链接没反应 → Redirect URL 含 `/login`；Site URL 为 `http://localhost:4000`
