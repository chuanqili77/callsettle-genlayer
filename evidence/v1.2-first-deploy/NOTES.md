# v1.2 first deployment — abandoned (network-level stuck transaction)

First v1.2 deployment: contract
0xF183E90Ea3C2Af4DcD54eeB6a2595732A80AC9e8, deploy tx
0x3e3fa024dd601cfa56db8447791f77174852f17d11bac6cb4365cdc22e4c8667.
The contract source is byte-identical to the live v1.2 deployment
(same SHA-256 3271ff330e97b64a3a2977f630beceb6cf00a70975834ea08aa90a4405973fd2);
only the deployment is abandoned, not the source.

What happened: the scripted evidence run completed 20 transactions
(3 listings, 5 calls, 4 settlements, 1 cancel, 6 withdrawals, 1
negative — see transactions.json), then the c6-call transaction
(0xdb9a69b990bf38181efbae9583e1b33e5a1656f8bfc60a260c108c1858d9fbbe,
buyer B1, 3 GEN, sent 2026-11-12 06:35:12 UTC) stuck in PROPOSING
for 40+ minutes: the leader's GenVM execution started but never
completed, no validator phase began, and the transaction never
reached ACCEPTED or FINALIZED. The Studionet itself was live at
the time (other transactions finalized normally). This is a network
issue, not a contract defect — the identical call had already
succeeded three times in the same run (C1, C2, C5).

Funds: the 3 GEN sent with the stuck call left the buyer's balance
and sits in this contract's balance (contract balance 3 GEN,
accounted received 13 GEN, withdrawn 13 GEN). If the transaction
is eventually canceled, the value returns; if it finalizes, call 6
appears on this abandoned contract, FUNDED. Either way it is
testnet GEN, zero cash cost, and this contract is abandoned — no
further action is planned on it. The evidence run was restarted
from scratch on a fresh v1.2 deployment instead of waiting on an
unbounded network stall.

The files in this directory are the partial records of the
abandoned attempt (deployment.json, transactions.json with the 20
transactions that did finalize).

## Update (2026-11-12): stuck tx resolved, contract closed

The stuck c6-call (0xdb9a69b9...) eventually FINALIZED: call 6 appeared
FUNDED on this contract. It was then settled (0x299a87b85644647f32bba7647b28d962c99aaece49cc43999dbfee345249cb89,
RESPONSE_VALID) and the 3 GEN provider credit withdrawn
(0x8e64924da2f6f9030035d704e96e1eff477b593486fa866797c875d27875e802).
Final ledger: 16 GEN in = 16 GEN out, balance 0, escrow 0. The retained
checkpoint file holding the first-deploy temp keys was deleted after
the withdrawal FINALIZED. This contract remains abandoned; no further
action.
