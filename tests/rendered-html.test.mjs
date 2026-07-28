import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Renda Signal multi-page product and metadata are wired", async () => {
  const [page, explore, workspace, shell, newSignal, shareSignal, setup, polygon, signalsApi, layout, contract, testToken, authStart, authCallback] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/explore/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/signal-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/x-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/x/new/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/x/share/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/x/setup/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/polygon.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/signals/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../contracts/RendaSignalEscrow.sol", import.meta.url), "utf8"),
    readFile(new URL("../contracts/TestUSDT.sol", import.meta.url), "utf8"),
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
  assert.match(workspace, /SHARING REMINDER/);
  assert.match(workspace, /Post to X/);
  assert.match(workspace, /Recover funding/);
  assert.match(workspace, /funding_pending/);
  assert.doesNotMatch(workspace, /@david|@somiari|SIG-1042/);
  assert.match(shell, /\/api\/auth\/x\/me/);
  assert.match(shell, /profile\.username/);
  assert.doesNotMatch(shell, /0x7A91|For me <i>3/);
  assert.match(newSignal, /wallet_switchEthereumChain/);
  assert.match(newSignal, /functionName:"approve"/);
  assert.match(newSignal, /functionName:"fundRequest"/);
  assert.match(newSignal, /Minimum 48 hours/);
  assert.match(newSignal, /\/x\/share\?id=/);
  assert.match(shareSignal, /Hello \$\{signal\.target_handle\}/);
  assert.match(shareSignal, /Post message to X/);
  assert.match(shareSignal, /Download payment card/);
  assert.match(shareSignal, /Make sure to add the payment card to your tweet/);
  assert.match(shareSignal, /target="_blank"/);
  assert.doesNotMatch(shareSignal, /Open X composer/);
  assert.match(shareSignal, /twitter\.com\/intent\/tweet/);
  assert.match(shareSignal, /canvas\.toBlob/);
  assert.match(setup, /deployContract/);
  assert.match(setup, /configured deployment wallet/);
  assert.match(polygon, /AMOY_CHAIN_ID=80002/);
  assert.match(signalsApi, /waitForTransactionReceipt/);
  assert.match(signalsApi, /RequestFunded/);
  assert.match(signalsApi, /acceptedTermsHashes/);
  assert.match(signalsApi, /funding_pending/);
  assert.match(newSignal, /\.trim\(\)/);
  assert.match(authStart, /code_challenge_method:"S256"/);
  assert.match(authCallback, /\/2\/oauth2\/token/);
  assert.match(authCallback, /\/2\/users\/me/);
  assert.match(page, /Polygon/);
  assert.doesNotMatch(page, /Nimiq Quest|codex-preview/);
  assert.match(contract, /function acceptSettlement/);
  assert.match(contract, /function arbitrate/);
  assert.match(contract, /function reclaimUnaccepted/);
  assert.match(contract, /employerAmount \+ employeeAmount == item\.total - item\.attentionFee/);
  assert.match(contract, /modifier nonReentrant/);
  assert.match(testToken, /Renda Test USDT/);
});
