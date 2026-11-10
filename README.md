# pages-proxy

给 `api-worker` 套一层 Cloudflare Pages 自定义域名入口，让 API 对外只有 `api.linx.is-a.dev`，
不再暴露 `*.workers.dev`。

## 结构

```
pages-proxy/
  _worker.js      # Pages Function（advanced mode）：所有请求原样交给 API_WORKER
  wrangler.toml   # 项目名 + nodejs_compat + Service binding
  .gitignore
```

## 现状

| 项 | 值 |
| --- | --- |
| Pages 项目 | `linx-api` |
| 项目域名（固定） | `linx-api-78i.pages.dev` |
| Service binding | `API_WORKER` → `api-worker` |
| 自定义域名 | `api.linx.is-a.dev`（Pages 侧已登记，等 DNS 的 CNAME 生效后自动激活） |

`78i` 是建项目时分配的随机后缀，**重新部署不会变**；每次部署变的只是 `89847d37.linx-api-78i.pages.dev`
这类 8 位 hash 前缀的单次部署别名，不要把它写进 DNS。

## 部署

```powershell
cd D:\this_code\cloudflare-workers\pages-proxy

# 建项目（只在第一次；已建过重跑会提示已存在）
& "D:\this_code\cloudflare-workers\api-worker\node_modules\.bin\wrangler.cmd" pages project create linx-api --production-branch main

# 部署（绑定随配置一起生效）
& "D:\this_code\cloudflare-workers\api-worker\node_modules\.bin\wrangler.cmd" pages deploy --project-name linx-api --commit-dirty=true
```

本地没有 wrangler 时，把上面的路径换成 `npx wrangler` 也行。

## 验证

```powershell
curl.exe -sS https://linx-api-78i.pages.dev/
curl.exe -sS -X POST -H 'Content-Type: application/json' -d '{"email":"a@b.c","password":"x"}' https://linx-api-78i.pages.dev/auth/login
```

期望：`GET /` 返回 Worker 的 `{"code":"ok","detail":"ok","data":{"service":"api-worker","status":"ok"}}`；
`POST /auth/login` 返回 `401 invalid_credentials`（说明方法、body、路径都透传了）。
返回 500 且提示 binding missing → 绑定没生效，检查 `wrangler.toml` 后重新部署。

## 三个坑

1. wrangler 4 的 `pages deploy` **不会替你建项目**，必须先 `pages project create`。
2. **必须带 `nodejs_compat`**，否则部署报 `Uncaught Error: No such module "node:stream"`。
3. 绑定**只能走 `wrangler.toml`**；用 REST API 改 `deployment_configs.production.env` 会返回
   `success=true` 但 `env` 仍是 null，实际不生效。

## 域名侧约束

- is-a.dev 的 DNS 记录必须写 **`"CNAME": "linx-api-78i.pages.dev"` 且 `"proxied": false`**。
  实测 `api.linx.is-a.dev` 是二级子域，开橙云会直接 `TLS alert 'HandshakeFailure'`（is-a.dev 的 zone
  没有为二级名字签证书）；证书由 Pages 的自定义域名流程签发。
- 注册记录需要你自己在 `is-a.dev/register` 提 PR（该仓库明确不接受 AI 生成的 PR）。

完整的注册流程、实测数据和原理说明见 `..\isa\README.md`。
