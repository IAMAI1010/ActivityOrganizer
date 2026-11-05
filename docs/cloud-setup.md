# 云端配置与绑定说明

Web 端与小程序端**共用同一个 WorkBuddy 云应用**。本文记录这套绑定关系、权限边界和排查要点，避免换机器或重建环境时把云服务接错。

## 1. 应用与端点

| 项 | 值 |
|---|---|
| 云应用 ID | `wbapp_KH4zoJ66eAXucCxjhSCSgh` |
| 云服务资源 | `wbcs_qOSdmEfdqBf29FEXmjOCz3` |
| API endpoint | `https://mp-api.app.workbuddy.host` |
| Web 站点 | 已发布在 `activity-organizer.app.workbuddy.host`（分享链接需带 `sharecode`，裸域名返回 403） |
| 小程序 AppID | `wx35d82118c27b18b5` |

配置落在两处，**必须指向同一应用**：

- `miniprogram/utils/config.js` — `endpoint` / `publishableKey` / `workBuddyOAuthClientId`
- `web/src/cloud.js` — `publicConfig` 的 `endpoint` / `publishableKey`

`publishableKey` 是前端可用的公开发布密钥，值以源码为准；**不要把 secret key、service role key 或 `.env` 提交进仓库**（`.gitignore` 已排除 `.env*`）。

## 2. 数据表

| 表 | 用途 | 关键字段 |
|---|---|---|
| `activities` | 活动 | `title`、`location`、`latitude`/`longitude`、`start_at`/`end_at`、`cover_url`、`form_fields` (jsonb)、`status`、`owner_id` |
| `signups` | 报名 | `activity_id`、`nickname`/`avatar_url`、`name`/`phone`、`answers` (jsonb)、`owner_id` |

数据链路：Web 端建活动写 `activities` → 小程序端读活动、写 `signups` → Web 端看名单。

## 3. RLS 权限边界（8 条策略）

| 表 | 策略 | 角色 | 含义 |
|---|---|---|---|
| activities | `activities_insert_own` | authenticated | `owner_id = auth.uid()` 才能建 |
| activities | `activities_update_own` / `activities_delete_own` | authenticated | 仅创建者可改删 |
| activities | `activities_read_public` | anon, authenticated | `status IN ('published','ended')` 或本人 |
| signups | `signups_insert_any` | anon, authenticated | 匿名可报名（写入时 `owner_id IS NULL`） |
| signups | `signups_read_owner` | authenticated | 组织者可读本活动报名全字段（含手机号） |
| signups | `signups_read_public` | anon | **仅已发布/已结束活动**，见 `sql/2026-11-05_signups_read_public.sql` |
| signups | `signups_delete_own` | authenticated | 仅本人可删 |

两个容易误判的点：

1. **小程序端没有登录逻辑**，所以无法编辑活动（`activities_*_own` 要求 `auth.uid()` 匹配）。这是刻意设计：小程序保持「只读展示 + 报名」，编辑统一在 Web 端完成。
2. **anon 在 `signups` 上没有表级 SELECT**，只有 5 列列级授权：`id`、`activity_id`、`nickname`、`avatar_url`、`created_at`。`name`/`phone`/`answers`/`owner_id` 匿名读不到（SDK 实测返回 `DATABASE_42501`）。小程序详情页的「已报名 N 人 + 头像列表」只依赖这 5 列。

## 4. 应用卡与本地清单（不进版本控制）

`.gitignore` 明确排除了 `.wbapp_*.genie` 和 `.workbuddy/`，原因：

- 应用卡是**本机会话状态**，含云端绑定上下文，不同机器不通用
- 这些文件随账号/环境变化，提交只会造成冲突

### 排查：预览报「云服务不可用 / 读不到数据」

创建小程序应用卡时，注册流程**只按应用名称解析**，不会自动认出已有的云应用。若本会话里没有登记原应用，就会多建一张空应用卡（`cloudService: null`、`bindingType: none`），而代码里的 `publishableKey` 仍属于原应用，于是预览读不到数据。

正确处理：

1. 在 `WorkSpace/.workbuddy/applications.yaml` 登记**已有的**应用 ID（不要新建云环境）
2. 重建 `.wbapp_<应用ID>.genie` 应用卡
3. 用「复用已有应用」方式激活：`applicationMode=reuse` + `applicationId=wbapp_KH4zoJ66eAXucCxjhSCSgh`
4. 成功标志：返回 `reusedExisting: true`，且 `publicConfig` 的 `endpoint` / `publishableKey` / `workBuddyOAuthClientId` 与 `miniprogram/utils/config.js` **逐字一致**

误建的空应用卡归档到 `.workbuddy/app-card-backup/`，扩展名改为 `.genie.bak`，避免被识别成有效应用卡。

## 5. 迁移记录

| 文件 | 内容 |
|---|---|
| `sql/2026-11-05_signups_read_public.sql` | 把匿名读 `signups` 从 `USING true` 收窄为「仅 published/ended 活动」，含验证与回滚语句 |

云端策略变更务必同步补一份迁移文件，否则重建环境时会退回宽松权限。

## 6. 发布前置项（账号侧，代码解决不了）

小程序备案、request 合法域名（`mp-api.app.workbuddy.host`）、《用户隐私保护指引》、服务类目、小程序头像上传，均在微信公众平台后台配置。`project.config.json` 的 `urlCheck: false` 只在开发者工具里生效，正式版仍会校验域名。
