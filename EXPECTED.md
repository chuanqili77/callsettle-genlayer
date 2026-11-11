# EXPECTED.md — CallSettle evidence v1.1, pre-registered before the run

Protocol callsettle-1.1. Written 2026-11-12, before any v1.1 evidence
transaction was sent. Every case below lists its expected on-chain
outcome; the run aborts if a result differs. Temperature bands are
NOT pre-registered (a band flip at a boundary only produces a
consensus disagreement and a retry); only the verdict is
pre-registered for each settlement.

v1.1 is a single-mode market: every listed endpoint is an Open-Meteo
forecast endpoint (list_endpoint rejects any URL that does not start
with `https://api.open-meteo.com/v1/forecast`, error URL_HOST).
The one public mode is: HTTP 200, JSON, `current.temperature_2m` a
number in -60..60, `current.time` a string. The schema_note stored at
listing is a human-readable description of this single mode, not a
per-endpoint settlement rule, and is never fed into consensus.
v1.0 (contract 0x445Fcd2bBCEbF42C7EE3946644ADdb64698E66E2, protocol
callsettle-1) is superseded and abandoned; its EXPECTED.md, EVIDENCE.md,
REVIEWER.md, transactions.json and deployment.json are archived
unchanged in evidence/v1/.

Endpoints (provider P1 lists all three):
| ID | URL | Price | Expected |
|----|-----|-------|----------|
| E1 | https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m&timezone=Europe%2FBerlin | 3 GEN | Listed ACTIVE. Response verified live 2026-11-12 ~07:10 CST: HTTP 200, JSON, current.temperature_2m=4.0, current.time string. |
| E2 | https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&timezone=Europe%2FBerlin | 2 GEN | Listed ACTIVE. Response verified live: HTTP 200, JSON, no `current` field. Must settle RESPONSE_INVALID. |
| E3 | https://api.open-meteo.com/v1/forecast?latitude=999&longitude=999 | 2 GEN | Listed ACTIVE. Response verified live: HTTP 400 ("Latitude must be in range of -90 to 90°"). Must settle UNREACHABLE. Note: the originally sketched bad path `/v1/nope` cannot be listed under the v1.1 URL_HOST gate (it would fail at listing with URL_HOST and never reach settlement), so E3 is a forecast URL that passes listing and fails at fetch time — this tests UNREACHABLE at settlement, which is the point of the case. |

Calls (each call_api escrows the exact price):
| ID | Buyer | Endpoint | Price | Expected settlement |
|----|-------|----------|-------|---------------------|
| C1 | B1 | E1 | 3 GEN | RESPONSE_VALID, status SETTLED, provider_credit 3 GEN, buyer_credit 0. Settled by OUT (anyone may settle). |
| C2 | B2 | E1 | 3 GEN | RESPONSE_VALID, status SETTLED, provider_credit 3 GEN, buyer_credit 0. Settled by OUT. |
| C3 | B1 | E2 | 2 GEN | RESPONSE_INVALID, status REFUNDED, buyer_credit 2 GEN, provider_credit 0, E2 violations 1. Settled by OUT. |
| C4 | B2 | E3 | 2 GEN | UNREACHABLE, status REFUNDED, buyer_credit 2 GEN, provider_credit 0, E3 violations 0. Settled by OUT. |
| C5 | B1 | E1 | 3 GEN | Cancelled by buyer while FUNDED: status CANCELLED, buyer_credit 3 GEN, verdict empty. |

Withdrawals (pull-payment, one per entitled party per call):
| Call | Withdrawer | Expected |
|------|-----------|----------|
| C1 | P1 (provider) | 3 GEN out |
| C2 | P1 (provider) | 3 GEN out |
| C3 | B1 (buyer) | 2 GEN out |
| C4 | B2 (buyer) | 2 GEN out |
| C5 | B1 (buyer) | 3 GEN out |

Negatives (each must be a FINALIZED transaction with MAJORITY_AGREE
and the exact leader error payload below; state must not change,
contract balance must not change — every failed-payable negative in
v1.1 sends 0 GEN, so no value can be stranded):
| Label | Action | Expected error |
|-------|--------|----------------|
| neg0 | OUT cancels C5 (not the buyer) while FUNDED | ONLY_BUYER_CAN_CANCEL |
| neg1 | OUT settles C1 again (already SETTLED) | CALL_NOT_FUNDED |
| neg2 | B1 calls endpoint 99 (does not exist), sending 0 GEN | ENDPOINT_NOT_FOUND |
| neg3 | P1 lists the good URL at price 0 | PRICE |
| neg4 | P1 lists the good URL at price 11 | PRICE |
| neg5 | OUT withdraws C1 (provider's credit) | NO_CREDIT |
| neg6 | P1 withdraws C1 a second time | NO_CREDIT |
| neg7 | P1 lists https://httpbin.org/json at price 2 (not an Open-Meteo forecast URL) | URL_HOST |
| neg8 | B1 calls E1 sending 0 GEN instead of the exact 3 GEN price | VALUE_MUST_EQUAL_PRICE |

Final ledger (exact):
- GEN in: 3 + 3 + 2 + 2 + 3 = 13 GEN
- GEN out: provider 3 + 3 = 6 GEN; buyer 2 + 2 + 3 = 7 GEN; total 13 GEN
- Contract balance 0 GEN, escrow 0, total violations 1 (E2 only)
- E1: settled_valid 2, violations 0. E2: settled_valid 0, violations 1. E3: settled_valid 0, violations 0.
- has_required_fields is true exactly for VALID calls (C1, C2); false for C3, C4, C5.

## Honest note on failed payables (v1.1)

The v1.1 contract docstring states the truth: a failed payable call
KEEPS its value in the contract on Studionet (platform behavior, also
observed on LinguaCourt, where a failed payable stranded 21 GEN, and
in v1.0, where neg2 stranded 3 GEN). The v1.1 evidence run is
designed so no failed payable ever carries value: neg2 and neg8 both
send 0 GEN, and the frontend only submits the exact price to an
existing ACTIVE endpoint. Final contract balance must be 0 GEN.
