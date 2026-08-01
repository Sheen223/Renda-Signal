# Claims matrix

| Feature | What Renda does | Trust model |
| --- | --- | --- |
| X identity | X OAuth identifies the sender and target account. Wallet links can change without changing the X identity. | Renda server and X API |
| Managed NIM | Real NIM is sent to the disclosed Renda address. Renda records acceptance, evidence, disputes and payout instructions. | Custodial; admin sends payout or refund |
| Polygon escrow | tUSDT is locked in `RendaSignalEscrow`. Acceptance, approval, refund and arbitration move funds under contract rules. | On-chain, Polygon Amoy testnet |
| Evidence | The app stores the message and uploaded files, then writes an evidence hash to the Polygon contract. | Files are off-chain; hash is on-chain |
| Disputes | Both parties and the arbitrator share one case room. The Polygon arbitrator can split remaining escrow. | Chat is off-chain; Polygon ruling is on-chain |
| Public proof | The Proof page shows safe aggregate counts and public transaction links. | Read-only public evidence |

## We do not claim

- Managed NIM is not trustless escrow.
- Polygon tUSDT is not real USDT and has no monetary value.
- X, evidence storage and dispute messages are not decentralized.
- A recipient is not permanently tied to one wallet; the verified X account is the stable identity.
