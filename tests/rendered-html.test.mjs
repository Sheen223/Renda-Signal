import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Renda Signal product and metadata are wired", async () => {
  const [page, layout, contract] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../contracts/RendaSignalEscrow.sol", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /Renda Signal — Funded requests for anyone on X/);
  assert.match(layout, /twitter:/);
  assert.match(page, /Your attention has value/);
  assert.match(page, /Connect wallet/);
  assert.match(page, /Polygon/);
  assert.doesNotMatch(page, /Nimiq Quest|codex-preview/);
  assert.match(contract, /function acceptSettlement/);
  assert.match(contract, /function arbitrate/);
  assert.match(contract, /function reclaimUnaccepted/);
  assert.match(contract, /employerAmount \+ employeeAmount == item\.total - item\.attentionFee/);
});
