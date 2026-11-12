# EXPECTED.md — CallSettle evidence v1.3, pre-registered before the run

Protocol callsettle-1.3. Written 2026-11-12, before any v1.3 evidence
transaction was sent. Every case below lists its expected on-chain
outcome; the run aborts if a result differs. Temperature bands are
NOT pre-registered (a band flip at a boundary only produces a
consensus disagreement and a retry); only the verdict is
pre-registered for each settlement. For RESPONSE_VALID settlements
the call record must also carry a settlement-time snapshot
(temperature_2m, time, wind_speed_10m) whose band is derived from
its temperature; other verdicts carry snapshot null.

CallSettle is consensus-verified pay-per-call API settlement: a
buyer escrows the fee for one call, validators independently fetch
the public endpoint's response, and consensus decides whether the
provider is paid, the buyer is refunded, or a violation is recorded.
Open-Meteo is only the demo data source; the project claims no
exclusive API data and no commercial data license.

v1.3 is a single-mode market: every listed endpoint is an Open-Meteo
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
v1.2 (contract 0x0ae3DeB61fA3f84FA15EA164a9B0F2E59469e265, protocol
callsettle-1.2) is superseded and abandoned; its EXPECTED.md,
EVIDENCE.md, REVIEWER.md, transactions.json, deployment.json and
browser-transactions.json are archived in evidence/v1.2/. v1.2's
final state was 18 GEN in, 18 GEN withdrawn, 0 GEN balance. v1.1
and v1.0 are archived in evidence/v1.1/ and evidence/v1/.

Expected vs actual, carried over from v1.2: the v1.2 browser loop
pre-registered a London endpoint, but the loop actually listed a
Paris endpoint (same public mode, same 2 GEN price). The v1.2
record keeps that distinction. For v1.3 the browser loop below
pre-registers Paris directly, so the expected endpoint is the one
the loop is to list.

History that motivated v1.3: on 2026-11-12 the v1.2 browser receipt
showed the API response by re-fetching Open-Meteo from the browser,
and the fetch failed — the browser's shared network returned HTTP
429 ("Daily API request limit exceeded") for both the Paris and the
Berlin endpoint, while the same addresses returned data from other
networks. Settlement was not affected: the validators had fetched a
valid response minutes earlier (RESPONSE_VALID, required fields
present). v1.3 removes the re-fetch: the settlement-time snapshot
is written into the call record by consensus and the receipt shows
that snapshot read from the chain.

Endpoints (provider P1 lists all three):
| ID | URL | Price | Expected |
|----|-----|-------|----------|
| E1 | https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m&timezone=Europe%2FBerlin | 3 GEN | Listed ACTIVE. Response verified live 2026-11-12 ~07:10 CST: HTTP 200, JSON, current.temperature_2m=4.0, current.time string. |
| E2 | https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&timezone=Europe%2FBerlin | 2 GEN | Listed ACTIVE. Response verified live: HTTP 200, JSON, no `current` field. Must settle RESPONSE_INVALID. |
| E3 | https://api.open-meteo.com/v1/forecast?latitude=999&longitude=999 | 2 GEN | Listed ACTIVE. Response verified live: HTTP 400 ("Latitude must be in range of -90 to 90°"). Must settle UNREACHABLE. Note: a bad path `/v1/nope` cannot be listed under the URL_HOST gate (it would fail at listing and never reach settlement), so E3 is a forecast URL that passes listing and fails at fetch time — this tests UNREACHABLE at settlement, which is the point of the case. |

Calls (each call_api escrows the exact price):
| ID | Buyer | Endpoint | Price | Expected settlement |
|----|-------|----------|-------|---------------------|
| C1 | B1 | E1 | 3 GEN | RESPONSE_VALID, status SETTLED, provider_credit 3 GEN, buyer_credit 0. Settled by OUT (anyone may settle). Snapshot present: temperature_2m a number in -60..60, time a valid ISO string, wind_speed_10m a non-negative number or null, band derived from the snapshot temperature. |
| C2 | B2 | E1 | 3 GEN | RESPONSE_VALID, status SETTLED, provider_credit 3 GEN, buyer_credit 0. Settled by OUT. Snapshot present, same shape as C1. |
| C3 | B1 | E2 | 2 GEN | RESPONSE_INVALID, status REFUNDED, buyer_credit 2 GEN, provider_credit 0, E2 violations 1. Settled by OUT. Snapshot null. |
| C4 | B2 | E3 | 2 GEN | UNREACHABLE, status REFUNDED, buyer_credit 2 GEN, provider_credit 0, E3 violations 0. Settled by OUT. Snapshot null. |
| C5 | B1 | E1 | 3 GEN | Cancelled by buyer while FUNDED: status CANCELLED, buyer_credit 3 GEN, verdict empty. Snapshot null. |
| C6 | B1 | E1 | 3 GEN | RESPONSE_VALID, status SETTLED, provider_credit 3 GEN, buyer_credit 0. Settled by OUT. Snapshot present, same shape as C1. The provider credit is withdrawn inside the scripted run (c6-provider-withdraw), so the scripted ledger closes at balance 0. |

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
v1.3 sends 0 GEN, so no value can be stranded):
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
- Snapshots: present exactly for C1, C2, C6 (band matches the snapshot temperature); null for C3, C4, C5.
- Call count 6, endpoint count 3.

## Abandoned first v1.3 deploy (recorded after the fact)

The first v1.3 contract, `0x2992e9f69e8aAfBCB0E25AD1B433B3b31C0a7eAf`
(deploy tx `0xaa09cbfa2d1f33da4436a6ad7ff018edbeb171e71c7547fe1ba69ba0c659a518`),
was abandoned before any evidence was completed on it. Its settle
crashed: the settle of C1
(`0xc407c7921de85550d6a00ac7690e110895f89c926092dd52d774b01c3e62ce9c`)
reached FINALIZED with result 7, leader ERROR, payload `exit_code 1`,
and every voting validator also reported `exit_code 1` / disagree.
Cause: the non-deterministic consensus result carried a nested
snapshot dict containing floats, which the consensus layer cannot
encode. The pure logic was correct in isolation (mock tests and a
local stub pass). The fix, in the redeployed v1.3 contract, carries
the snapshot through consensus as flat integer fields only
(temperature and wind in tenths, time as a string); settle_call
divides by 10 when it writes the stored snapshot, so get_call still
reads the real values. No transaction from the abandoned deploy is
used as evidence for the redeployed contract. Close-out of the
abandoned deploy (details in `evidence/v1.3-first-deploy/NOTES.md`):
C1 cancelled
(`0x7a57eaa776b2467b71f18fc97587231d810e1b62634d06a8cafdf031f70a0774`),
buyer withdrew the 3 GEN refund
(`0xb1a8f39c576c4f00c93156023a27b6c21faa1811706ad318d9176718c544b033`),
final contract balance 0 GEN, 3 GEN in = 3 GEN out.

## Browser write-loop C8 (pre-registered before the browser run)

After the scripted evidence run, one more endpoint and call are made
through the live site in a real browser, with the site's own
in-browser temporary test account (never presented as a wallet
signature). The buyer address is not known in advance — it is the
temp account the browser creates, and is recorded afterwards with
the transaction hashes. The browser loop uses one fresh in-browser
temporary test account that is BOTH provider and buyer (the contract
has no guard against buyer == provider, and this is what makes an
in-browser provider withdrawal testable).

The loop is called C8: it continues the browser-loop sequence from
v1.2, whose browser call was C7. Its on-chain call_id on the v1.3
contract is 7, and its transaction labels use that id (c7-call,
c7-settle, c7-provider-withdraw), so the receipt links them.

| Step | Expected |
|------|----------|
| E4 listed by the browser temp account | URL https://api.open-meteo.com/v1/forecast?latitude=48.85&longitude=2.35&current=temperature_2m,wind_speed_10m&timezone=Europe%2FParis, price 2 GEN, ACTIVE. Temp account address recorded after. (Expected: Paris. The v1.2 loop pre-registered London and actually listed Paris; v1.3 pre-registers the Paris endpoint that is to be listed.) |
| C8: same temp account buys one call on E4 | 2 GEN escrowed, on-chain call id 7, FUNDED, then FINALIZED. |
| C8 settled from the site | RESPONSE_VALID, status SETTLED, provider_credit 2 GEN, buyer_credit 0. A settlement-time snapshot is written into the call record: temperature_2m a number in -60..60, time a valid ISO string, wind_speed_10m a non-negative number or null, band derived from the snapshot temperature. If the validators cannot fetch the endpoint (for example the free-tier daily limit is exhausted), the settlement is UNREACHABLE — that is a real outcome, recorded as such, and the loop is retried after the API recovers; no result is invented. |
| C8 receipt shows the settlement-time snapshot | The receipt displays "Settlement-time verified API snapshot" with the snapshot fields read from the chain (temperature, time, wind speed, band). It never re-fetches the endpoint, so the display does not depend on the browser's network. |
| C8 provider credit withdrawn from the site | The receipt shows the explicit “Withdraw provider credit · 2 GEN” button (temp account is the provider), pressed in the browser, FINALIZED + SUCCESS, receipt shows Withdrawn · 2 GEN. |

Ledger after C8 (exact):
- GEN in: 16 + 2 = 18 GEN
- GEN out: provider 9 + 2 = 11 GEN; buyer 7 GEN; total 18 GEN
- Contract balance 0 GEN, escrow 0, total violations 1 (E2 only)
- E1: settled_valid 3, violations 0. E4: settled_valid 1, violations 0. Call count 7, endpoint count 4.

## Honest note on failed payables (v1.3)

The v1.3 contract docstring states the truth: a failed payable call
KEEPS its value in the contract on Studionet — a failed payable is
not refunded. The v1.3 evidence run is designed so no failed
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
settles against whatever the response is then. The settlement-time
snapshot is the record of what a settlement was based on; the
receipt shows that snapshot read from the chain.
