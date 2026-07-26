import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Nimiq Quest marketplace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Nimiq Quest — Useful work, paid openly<\/title>/i);
  assert.match(html, /Small tasks\./);
  assert.match(html, /Work worth doing/);
  assert.match(html, /Connect wallet/);
  assert.match(html, /Create a task/);
  assert.match(html, /twitter:image/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});
