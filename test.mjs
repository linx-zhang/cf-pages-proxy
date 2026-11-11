import test from "node:test";
import assert from "node:assert/strict";
import worker from "./_worker.js";

function stubWorker(seen) {
	return {
		async fetch(request) {
			seen.push(request);
			return new Response(JSON.stringify({ method: request.method, url: request.url }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		},
	};
}

test("forwards method, url, headers and body untouched", async () => {
	const seen = [];
	const request = new Request("https://linx-api-78i.pages.dev/auth/login?x=1", {
		method: "POST",
		body: JSON.stringify({ email: "a@b.c", password: "x" }),
		headers: { "content-type": "application/json", authorization: "Bearer t" },
	});

	const response = await worker.fetch(request, { API_WORKER: stubWorker(seen) });

	assert.equal(seen.length, 1, "downstream Worker must be called exactly once");
	assert.equal(seen[0].method, "POST");
	assert.equal(seen[0].url, "https://linx-api-78i.pages.dev/auth/login?x=1");
	assert.equal(seen[0].headers.get("authorization"), "Bearer t");
	assert.equal(await seen[0].text(), '{"email":"a@b.c","password":"x"}');
	assert.equal(response.status, 200);
});

test("returns the downstream status and body", async () => {
	const seen = [];
	const response = await worker.fetch(new Request("https://linx-api-78i.pages.dev/posts"), {
		API_WORKER: {
			async fetch() {
				return new Response('{"code":"ok","detail":"ok","data":[]}', {
					status: 201,
					headers: { "content-type": "application/json" },
				});
			},
		},
	});
	assert.equal(response.status, 201);
	assert.match(await response.text(), /"code":"ok"/);
});

test("fails loudly when the service binding is missing", async () => {
	const response = await worker.fetch(new Request("https://linx-api-78i.pages.dev/"), {});
	assert.equal(response.status, 500);
	assert.match(await response.text(), /API_WORKER/);
});
