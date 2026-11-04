# ActivityOrganizer

活动组织工具：PC 端编辑活动并生成活动卡，微信小程序端分享卡片、收集报名。

- `web/`：Vue 3 + Vite，活动编辑与报名名单
- `miniprogram/`：原生微信小程序，活动列表、详情、报名

## 本地运行

```bash
cd web
npm install
npm run dev
```

## 地图选点（可选）

活动地点既可以只填文字，也可以在地图上标点。标点后活动卡与小程序详情页会多一个导航入口。

1. 在[腾讯位置服务控制台](https://lbs.qq.com/dev/console/key/manage)申请 key（个人免费额度够用）。
2. 把 `web/.env.example` 复制为 `web/.env`，填入 `VITE_TMAP_KEY=你的key`。
3. 在该 key 的域名白名单里加上站点域名，例如 `activity-organizer.app.workbuddy.host`；本地调试再加 `localhost`。

没有配置 key 时，地图按钮会提示填入 key，地点字段仍可正常手填保存。地图源仅使用腾讯/高德/百度/天地图等合规服务，坐标采用 GCJ-02。
