// Cloudflare Pages 中转层：把 linx-api-78i.pages.dev 上的请求原样转给 api-worker。
//
// 部署：
//   wrangler pages deploy --project-name linx-api --commit-dirty=true
// 依赖：
//   wrangler.toml 里的 [[services]] 绑定 API_WORKER -> api-worker
// 说明：
//   service binding 是账号内的进程间调用，Request（含 body 流、header、URL）原样传入，
//   Worker 的响应原样返回；不跨境、没有第二次 TLS，也不会出现 workers.dev 域名。
export default {
	async fetch(request, env) {
		if (!env.API_WORKER) {
			return new Response(
				"API_WORKER service binding is missing: check wrangler.toml [[services]] and redeploy",
				{ status: 500 },
			);
		}
		return env.API_WORKER.fetch(request);
	},
};
