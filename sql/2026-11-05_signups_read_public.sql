-- Migration: 2026-11-05_signups_read_public
-- 目标：收窄匿名角色（anon）对 signups 的可见行范围
-- 应用：wbapp_KH4zoJ66eAXucCxjhSCSgh（WorkBuddy Cloud）
-- 状态：已于 2026-11-05 在云端执行并验证
--
-- -------------------------------------------------------------------
-- 背景
-- -------------------------------------------------------------------
-- 原策略 signups_read_public（FOR SELECT TO anon）使用 USING (true)，
-- 匿名角色可以枚举任意活动的报名行，包括草稿 / 未发布活动下的报名。
-- 这与 activities_read_public 不一致：活动本身只对 published / ended
-- 可见，其报名行却没有任何行级限制。
--
-- 重要前提：anon 在 public.signups 上没有表级 SELECT，只有列级授权：
--   id, activity_id, nickname, avatar_url, created_at
-- name / phone / answers / owner_id 从未对 anon 开放。用官方 SDK 以匿名
-- 身份 select('id,name,phone,answers') 会返回 DATABASE_42501。
-- 所以本迁移解决的是「行范围过宽」，不是「手机号泄露」；列级授权不动。
--
-- 影响面：
--   + 小程序详情页「已报名 N 人 / 头像列表」只依赖上述 5 列，保持可用
--   + Web 端报名名单走 authenticated + signups_read_owner，不受影响
--   + signups_insert_any 允许匿名报名，未改动
--
-- -------------------------------------------------------------------
-- 执行方式
-- -------------------------------------------------------------------
-- WorkBuddy Cloud 的 migrate 模式按单条语句执行，故此处不包事务。
-- 两条语句需按顺序各执行一次；DROP IF EXISTS 保证可重复运行。
-- 用 psql 直接执行时，整份文件粘贴即可。

DROP POLICY IF EXISTS signups_read_public ON public.signups;

CREATE POLICY signups_read_public ON public.signups
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.activities a
      WHERE a.id = signups.activity_id
        AND a.status = ANY (ARRAY['published'::text, 'ended'::text])
    )
  );

-- -------------------------------------------------------------------
-- 验证
-- -------------------------------------------------------------------
-- 1) 确认策略定义
--    SELECT polname, polcmd, polroles::regrole[],
--           pg_get_expr(polqual, polrelid) AS using_expr
--    FROM pg_policy
--    WHERE polrelid = 'public.signups'::regclass
--      AND polname = 'signups_read_public';
--
-- 2) 确认列级授权未被放大（table_select 应为 false）
--    SELECT has_table_privilege('anon','public.signups','SELECT') AS table_select,
--           (SELECT string_agg(column_name, ', ' ORDER BY column_name)
--            FROM information_schema.role_column_grants
--            WHERE table_schema='public' AND table_name='signups'
--              AND grantee='anon' AND privilege_type='SELECT') AS columns;
--
-- 3) 匿名 SDK 实跑：brief 5 列应成功；带 name/phone/answers 应返回 42501。
--
-- -------------------------------------------------------------------
-- 回滚
-- -------------------------------------------------------------------
-- BEGIN;
-- DROP POLICY IF EXISTS signups_read_public ON public.signups;
-- CREATE POLICY signups_read_public ON public.signups
--   FOR SELECT TO anon USING (true);
-- COMMIT;
