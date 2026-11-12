# EXPECTED.md — CallSettle evidence v1.2, pre-registered before the run

Protocol callsettle-1.2. Written 2026-11-12, before any v1.2 evidence
transaction was sent. Every case below lists its expected on-chain
outcome; the run aborts if a result differs. Temperature bands are
NOT pre-registered (a band flip at a boundary only produces a
consensus disagreement and a retry); only the verdict is
pre-registered for each settlement.

v1.2 is a single-mode market: every listed endpoint is an Open-Meteo
forecast endpoint (list_endpoint rejects any URL that is not exactly
the forecast path `https://api.open-meteo.com/v1/forecast`,
optionally followed by a query string, error URL_HOST).
The one public mode is: HTTP 200, JSON, `current.temperature_2m` a
number in -60..60, `current.time` a string. The schema_note stored at
listing is a human-readable description of this single mode, not a
per-endpoint settlement rule, and is never fed into consensus. The
note itself is provider-written text, checked only for length
(10–280 chars); it is not verified, and the endpoint URL is the
source of truth.
v1.1 (contract 0x58c71cDA976912e9F16438317dE7804523EFaEe6, protocol
callsettle-1.1) is superseded and abandoned; its EXPECTED.md,
EVIDENCE.md, REVIEWER.md, transactions.json and deployment.json are
archived in evidence/v1.1/. v1.1's final state was 18 GEN in, 15 GEN
withdrawn, 3 GEN balance — the 3 GEN is a provider credit to P1
whose evidence-run temporary key was deleted, so it is
unrecoverable in practice. That is disclosed here, not hidden.
The first v1.2 deployment (contract
0xF183E90Ea3C2Af4DcD54eeB6a2595732A80AC9e8, same source) was also
abandoned: its evidence run stalled on a network-level stuck
transaction (see evidence/v1.2-first-deploy/NOTES.md). The live
v1.2 deployment is a fresh deploy of the identical source.
v1.0 is archived in evidence/v1/.

Endpoints (provider P1 lists all three):
| ID | URL | Price | Expected |
|----|-----|-------|----------|
| E1 | https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m&timezone=Europe%2FBerlin | 3 GEN | Listed ACTIVE. Response verified live 2026-11-12 ~07:10 CST: HTTP 200, JSON, current.temperature_2m=4.0, current.time string. |
| E2 | https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&timezone=Europe%2FBerlin | 2 GEN | Listed ACTIVE. Response verified live: HTTP 200, JSON, no `current` field. Must settle RESPONSE_INVALID. |
| E3 | https://api.open-meteo.com/v1/forecast?latitude=999&longitude=999 | 2 GEN | Listed ACTIVE. Response verified live: HTTP 400 ("Latitude must be in range of -90 to 90°"). Must settle UNREACHABLE. Note: a bad path `/v1/nope` cannot be listed under the URL_HOST gate (it would fail at listing and never reach settlement), so E3 is a forecast URL that passes listing and fails at fetch time — this tests UNREACHABLE at settlement, which is the point of the case. |

Calls (each call_api escrows the exact price):
| ID | Buyer | Endpoint | Price | Expected settlement |
|----|-------|----------|-------|---------------------|
| C1 | B1 | E1 | 3 GEN | RESPONSE_VALID, status SETTLED, provider_credit 3 GEN, buyer_credit 0. Settled by OUT (anyone may settle). |
| C2 | B2 | E1 | 3 GEN | RESPONSE_VALID, status SETTLED, provider_credit 3 GEN, buyer_credit 0. Settled by OUT. |
| C3 | B1 | E2 | 2 GEN | RESPONSE_INVALID, status REFUNDED, buyer_credit 2 GEN, provider_credit 0, E2 violations 1. Settled by OUT. |
| C4 | B2 | E3 | 2 GEN | UNREACHABLE, status REFUNDED, buyer_credit 2 GEN, provider_credit 0, E3 violations 0. Settled by OUT. |
| C5 | B1 | E1 | 3 GEN | Cancelled by buyer while FUNDED: status CANCELLED, buyer_credit 3 GEN, verdict empty. |
| C6 | B1 | E1 | 3 GEN | RESPONSE_VALID, status SETTLED, provider_credit 3 GEN, buyer_credit 0. Settled by OUT. The provider credit is withdrawn inside the scripted run (c6-provider-withdraw), so the scripted ledger closes at balance 0. |

Withdrawals (pull-payment, one per entitled party per call):
| Call | Withdrawer | Expected |
|------|-----------|----------|
| C1 | P1 (provider) | 3 GEN out |
| C2 | P1 (provider) | 3 GEN out |
| C3 | B1 (buyer) | 2 GEN out |
| C4 | B2 (buyer) | 2 GEN out |
| C5 | B1 (buyer) | 3 GEN out |
| C6 | P1 (provider) | 3 GEN out |

Negatives (each must be a FINALIZED transaction with MAJORITY_AGREE
and the exact leader error payload below; state must not change,
contract balance must not change — every failed-payable negative in
v1.2 sends 0 GEN, so no value can be stranded):
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
| neg9 | P1 lists https://api.open-meteo.com/v1/forecastXYZ?latitude=52.52&longitude=13.41 at price 2 (junk path after the forecast path) | URL_HOST |

Final ledger, scripted run (exact):
- GEN in: 3 + 3 + 2 + 2 + 3 + 3 = 16 GEN
- GEN out: provider 3 + 3 + 3 = 9 GEN; buyer 2 + 2 + 3 = 7 GEN; total 16 GEN
- Contract balance 0 GEN, escrow 0, total violations 1 (E2 only)
- E1: settled_valid 3, violations 0. E2: settled_valid 0, violations 1. E3: settled_valid 0, violations 0.
- has_required_fields is true exactly for VALID calls (C1, C2, C6); false for C3, C4, C5.
- Call count 6, endpoint count 3.

## Browser write-loop C7 (pre-registered before the browser run)

After the scripted evidence run, one more endpoint and call are made
through the live site in a real browser, with the site's own
in-browser temporary test account (never presented as a wallet
signature). The buyer address is not known in advance — it is the
temp account the browser creates, and is recorded afterwards with
the transaction hashes. The browser loop uses one fresh in-browser
temporary test account that is BOTH provider and buyer (the contract
has no guard against buyer == provider, and this is what makes an
in-browser provider withdrawal testable).

| Step | Expected |
|------|----------|
| E4 listed by the browser temp account | URL https://api.open-meteo.com/v1/forecast?latitude=48.85&longitude=2.35&current=temperature_2m,wind_speed_10m&timezone=Europe%2FParis, price 2 GEN, ACTIVE. Temp account address recorded after. (Actual: the loop listed Paris; the pre-registration named London — same public mode, same price.) |
| C7: same temp account buys one call on E4 | 2 GEN escrowed, call id 7, FUNDED, then FINALIZED. |
| C7 settled from the site | RESPONSE_VALID, status SETTLED, provider_credit 2 GEN, buyer_credit 0. |
| C7 provider credit withdrawn from the site | The receipt shows the explicit “Withdraw provider credit · 2 GEN” button (temp account is the provider), pressed in the browser, FINALIZED + SUCCESS, receipt shows Withdrawn · 2 GEN. |

Ledger after C7 (exact):
- GEN in: 16 + 2 = 18 GEN
- GEN out: provider 9 + 2 = 11 GEN; buyer 7 GEN; total 18 GEN
- Contract balance 0 GEN, escrow 0, total violations 1 (E2 only)
- E1: settled_valid 3, violations 0. E4: settled_valid 1, violations 0. Call count 7, endpoint count 4.

Actual (2026-11-12): all four browser transactions FINALIZED
(list 0x912146280dc37b10911287978ee42a9e4f53aaa9ea8d1b7f180002c33e5236af,
call 0xcc68994224862590245e29bff854f5ed7abe324f87515cee15f4e952ab9f4549,
settle 0x142461c216015d68ccbd29d2d655ec31364e55a8a623763c76344bec9197b262,
withdraw 0x9a9d7652927767054e82a944357d771531ae0d41f7957967e2490bd3bae7b854),
temp account 0xebe057fdd4dbe105dba26706ad079089cb502574, call #7 SETTLED
RESPONSE_VALID, band 0_10, provider credit withdrawn. Final ledger
18 in = 18 out, balance 0. Note: the receipt's "Show the API response
for this call" button failed in this run — Open-Meteo's free-tier
daily request limit was exhausted at the time, so the browser could
not fetch the response to display (the validators had fetched it
successfully minutes earlier during settlement). The display feature
is implemented; the failure was upstream and transient, and is
recorded here as a known limit.

## Honest note on failed payables (v1.2)

The v1.2 contract docstring states the truth: a failed payable call
KEEPS its value in the contract on Studionet — a failed payable is
not refunded. The v1.2 evidence run is designed so no failed
payable ever carries value: neg2 and neg8 both send 0 GEN, and the
frontend only submits the exact price to an existing ACTIVE
endpoint. Final scripted contract balance is 0 GEN, and the final
balance after the browser loop is 0 GEN as well. Settlement records
pull-payment credits; a buyer can also cancel a FUNDED call for a
full refund before any verdict — so funds can move on a cancel as
well as on a verdict, and the draft and docs say so plainly.

## What settlement does not guarantee

CallSettle verifies that the response validators fetched at
settlement time matches the single public mode. It does not
guarantee the third-party API is always available, and it does not
guarantee its responses stay the same over time — a later fetch of
the same endpoint can return different weather, and a later call
settles against whatever the response is then.
