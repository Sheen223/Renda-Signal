# Renda Signal

Renda Signal lets a sender create a public, funded request for a specific X account. The recipient proves control of the targeted social identity, links a Polygon wallet, receives an optional attention fee on acceptance, and receives the completion reward after delivery.

## Settlement model

- Polygon USDT is deposited into `RendaSignalEscrow` when a request is funded.
- An identity attestation binds the targeted X user to one recipient wallet.
- The sender cannot reclaim an accepted request unilaterally.
- Either party can propose a mutual settlement; the other party must accept it.
- In a dispute, the named arbitrator can refund, release, or split only between the registered parties.
- Unaccepted requests can be reclaimed only after their acceptance deadline.

## Mini App integration

The interface runs inside Nimiq Pay and uses its injected Ethereum provider for Polygon wallet actions. Durable request and identity records use D1; evidence files use R2; settlement truth remains on Polygon.

## Current prototype

The product workflow, persistence schema, evidence endpoint, responsive interface, and Solidity escrow source are implemented. Production use still requires X OAuth credentials, a deployed and audited Polygon escrow contract, the official Polygon USDT address, and an independently secured identity-attestation signer.

Do not use unaudited contracts with real funds.
