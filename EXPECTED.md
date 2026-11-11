# EXPECTED.md — CallSettle evidence, pre-registered before the run

Written 2026-11-12, before any evidence transaction was sent. Every
case below lists its expected on-chain outcome; the run aborts if a
result differs. Temperature bands are NOT pre-registered (a band flip
at a boundary only produces a consensus disagreement and a retry);
only the verdict is pre-registered for each settlement.

Endpoints (provider P1 lists all three):
| ID | URL | Price | Expected |
|----|-----|-------|----------|
| E1 | https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m&timezone=Europe%2FBerlin | 3 GEN | Listed ACTIVE. Response verified live 2026-11-12 06:31 CST: HTTP 200, JSON, current.temperature_2m=4.0, current.time string. |
| E2 | https://httpbin.org/json | 2 GEN | Listed ACTIVE. Response verified live: HTTP 200, JSON, no `current` field. |
| E3 | https://nonexistent-callsettle-xyz.invalid/ | 2 GEN | Listed ACTIVE. Host verified unreachable (curl fails). |

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
and the exact leader error payload below; state must not change):
| Label | Action | Expected error |
|-------|--------|----------------|
| neg0 | OUT cancels C5 (not the buyer) while FUNDED | ONLY_BUYER_CAN_CANCEL |
| neg1 | OUT settles C1 again (already SETTLED) | CALL_NOT_FUNDED |
| neg2 | B1 calls endpoint 99 (does not exist), paying 3 GEN | ENDPOINT_NOT_FOUND |
| neg3 | P1 lists the good URL at price 0 | PRICE |
| neg4 | P1 lists the good URL at price 11 | PRICE |
| neg5 | OUT withdraws C1 (provider's credit) | NO_CREDIT |
| neg6 | P1 withdraws C1 a second time | NO_CREDIT |

Final ledger (exact):
- GEN in: 3 + 3 + 2 + 2 + 3 = 13 GEN
- GEN out: provider 3 + 3 = 6 GEN; buyer 2 + 2 + 3 = 7 GEN; total 13 GEN
- Contract balance 0, escrow 0, total violations 1 (E2 only)
- E1: settled_valid 2, violations 0. E2: settled_valid 0, violations 1. E3: settled_valid 0, violations 0.
- has_required_fields is true exactly for VALID calls (C1, C2); false for C3, C4, C5.

## Addendum (written 2026-11-12 during the run, after neg2 — the pre-registered part above is unchanged)

neg2 (call to nonexistent endpoint 99, 3 GEN sent) returned the exact
expected error ENDPOINT_NOT_FOUND, but the run's state-unchanged check
caught a real platform behavior: a FAILED payable call keeps its value
— the contract balance rose by exactly the 3 GEN sent, while every
contract-accounting field (received, withdrawn, escrow, calls,
endpoints, violations) stayed identical. This matches the LinguaCourt
finding (a failed payable stranded 21 GEN there). The 3 GEN has no
withdraw path and stays in the contract; it is disclosed in EVIDENCE.md
rather than hidden. Adjusted final ledger: 13 GEN in = 13 GEN out
through the contract's accounting, escrow 0, contract balance 3 GEN
(stranded failed-payable value), violations 1.
