import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Renda Signal multi-page product and metadata are wired", async () => {
  const [page, explore, workspace, shell, layout, contract, authStart, authCallback] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/explore/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/signal-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/x-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../contracts/RendaSignalEscrow.sol", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/x/start/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/x/callback/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /Renda Signal — Funded requests for anyone on X/);
  assert.match(layout, /twitter:/);
  assert.match(page, /Make your/);
  assert.match(page, /Explore the network/);
  assert.match(explore, /Sign in with X/);
  assert.match(explore, /\/api\/auth\/x\/start/);
  assert.match(explore, /COMING SOON/);
  assert.match(workspace, /Your attention has value/);
  assert.match(workspace, /\/api\/signals/);
  assert.match(workspace, /No signals yet/);
  assert.doesNotMatch(workspace, /@david|@somiari|SIG-1042/);
  assert.match(shell, /\/api\/auth\/x\/me/);
  assert.match(shell, /profile\.username/);
  assert.doesNotMatch(shell, /0x7A91|For me <i>3/);
  assert.match(authStart, /code_challenge_method:"S256"/);
  assert.match(authCallback, /\/2\/oauth2\/token/);
  assert.match(authCallback, /\/2\/users\/me/);
  assert.match(page, /Polygon/);
  assert.doesNotMatch(page, /Nimiq Quest|codex-preview/);
  assert.match(contract, /function acceptSettlement/);
  assert.match(contract, /function arbitrate/);
  assert.match(contract, /function reclaimUnaccepted/);
  assert.match(contract, /employerAmount \+ employeeAmount == item\.total - item\.attentionFee/);
});
