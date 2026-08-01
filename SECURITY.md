# Renda Signal security

## Current status

Polygon payments use test tokens on Polygon Amoy. Do not use the current deployment with valuable tokens. Native NIM uses managed custody and is intended only for small beta requests.

## Trust model

- Polygon tUSDT is enforced by `RendaSignalEscrow`.
- The identity signer only authorizes the immutable X user ID recorded for a request.
- The request's arbitrator can divide remaining funds only after a dispute.
- Native NIM is held and released by the Renda administrator. Blockchain checks prove transfers after they happen; they do not force the administrator to send them.

## Request deadlines

- An unaccepted Polygon request can be reclaimed by its employer after `acceptBy`.
- After acceptance, either party can open a dispute, including after the delivery or review deadline.
- Submitted work is released by employer approval or an arbitrator ruling.
- Cancellation always returns the remaining balance to the employer and requires the other party's approval. Any disagreement becomes a dispute.

## Deployment rule

Every contract source change requires a fresh deployment. The application must not be pointed at a replacement address until compilation, automated tests and a manual Amoy end-to-end test pass.

## Reporting

Do not post an exploitable issue publicly. Contact the repository owner with the affected function, a reproduction sequence and the expected safe behavior.

