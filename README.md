# pages-proxy

给 `api-worker` 套一层 Cloudflare Pages 入口：对外只有 `linx-api-78i.pages.dev`，
不再直接暴露 `*.workers.dev`。

## 结构

```
pages-proxy/
  _worker.js      # Pages Function（advanced mode）：所有请求原样交给 API_WORKER
  wrangler.toml   # 项目名 + nodejs_compat + Service binding
  test.mjs        # node --test 用例：透传 + 缺绑定的兜底
  .gitignore
```

仓库：https://github.com/linx-zhang/cf-pages-proxy （public）

## 现状

| 项 | 值 |
| --- | --- |
| Pages 项目 | `linx-api` |
| 入口域名（固定） | `linx-api-78i.pages.dev` |
| Service binding | `API_WORKER` → `api-worker` |
| 自定义域名 | 无，直接用项目域名 |

`78i` 是建项目时分配的随机后缀，**重新部署不会变**；每次部署变的只是 `89847d37.linx-api-78i.pages.dev`
这类 8 位 hash 前缀的单次部署别名，不要把它写进任何地方当入口。

## 部署

```powershell
cd D:\this_code\cloudflare-workers\pages-proxy

# 建项目（只在第一次；已建过重跑会提示已存在）
& "D:\this_code\cloudflare-workers\api-worker\node_modules\.bin\wrangler.cmd" pages project create linx-api --production-branch main

# 部署（绑定随配置一起生效）
& "D:\this_code\cloudflare-workers\api-worker\node_modules\.bin\wrangler.cmd" pages deploy --project-name linx-api --commit-dirty=true
```

本地没有 wrangler 时，把上面的路径换成 `npx wrangler` 也行。

## 测试

```powershell
node --test test.mjs
```

三个用例（已全部通过）：

1. `POST /auth/login?x=1` 经中转后，下游拿到的 **method / url / header / body** 完全一致；
2. 下游返回的 status 和 body 原样回给客户端；
3. `env.API_WORKER` 缺失时返回 500 并在 body 里点名 `API_WORKER`（而不是静默 404）。

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

## 自定义域名（当前不使用）

原来计划的 `api.linx.is-a.dev` 已放弃，入口固定用 `linx-api-78i.pages.dev`。
以后如果换成自有域名，优先把域名加在 `api-worker` 自己的 `wrangler` 配置里：

```jsonc
"routes": [{ "pattern": "api.yourdomain.com", "custom_domain": true }]
```

自有域名在同一个 CF 账号下，Workers 能直接签发证书、自动建 DNS 记录，
这一层 Pages 中转就没有必要了；届时删掉本仓库和 `linx-api` 项目即可。
