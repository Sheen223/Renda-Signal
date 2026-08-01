# Judge guide

Renda Signal lets someone send a funded public request to an X account. The recipient signs in with that X account, connects a wallet, accepts, submits work and gets paid.

## Fast demo

1. Open [rendasignal.xyz](https://rendasignal.xyz).
2. Choose **Explore**, then **X**.
3. Sign in with X.
4. Open **New signal** and choose a payment rail.
5. Use **Managed NIM** for real NIM or **Protected tUSDT** for Polygon Amoy testnet escrow.
6. Complete the recipient flow from the target X account.
7. Use **Proof** to inspect public receipts and clear product claims.

## What to inspect

- `contracts/RendaSignalEscrow.sol` — Polygon escrow rules.
- `app/api/signals` — identity, workflow and payment verification.
- `lib/nimiq-payments.ts` — managed NIM workflow.
- `tests/escrow.behavior.test.mjs` — contract behaviour tests.
- `docs/CLAIMS.md` — what is real, testnet, managed and on-chain.

## One-command check

```bash
npm ci
npm run judge-demo
```

This compiles contracts, runs lint, builds the app, runs the test suite and checks the judge-facing files.

## Important limit

Managed NIM is custodial in this version. Polygon tUSDT uses smart-contract escrow, but it runs on Amoy and has no monetary value. These limits are shown in the product and on the Proof page.
