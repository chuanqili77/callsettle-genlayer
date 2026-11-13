# CallSettle — Pay per API call, settled by consensus

Live site: https://chuanqili77.github.io/callsettle-genlayer/

Consensus-verified pay-per-call API settlement. A buyer escrows
payment for one API call. Validators independently fetch the
provider's public endpoint and judge the live response against the
single public mode (Open-Meteo weather response: HTTP 200, JSON,
`current.temperature_2m` a number in −60..60, `current.time` a
string). Valid pays the provider; invalid or unreachable refunds
the buyer. No middleman — just a receipt. Open-Meteo is only the
demo data source; the project claims no exclusive API data and no
commercial data license.

v1.3 is a single-mode market: every listed endpoint is an
Open-Meteo forecast endpoint — `list_endpoint` rejects any URL that
is not exactly the forecast path
`https://api.open-meteo.com/v1/forecast`, optionally followed by a
query string (error `URL_HOST`). Providers compete on per-call price. The
schema note stored at listing is a human-readable description of
this single mode, not a per-endpoint settlement rule. The note is
provider-written text, checked only for length (10–280 chars); it
is not verified, and the endpoint URL is the source of truth.

## How it works

1. **List.** A provider lists an Open-Meteo forecast endpoint with a
   per-call price (1–10 GEN) and a mode-description note. The
   settlement rule is the same for every endpoint: the single public
   mode above.
2. **Call.** A buyer pays the exact price for one call. The payment is
   escrowed; the call is FUNDED.
3. **Settle.** Anyone triggers settlement. Each validator fetches the
   endpoint independently and checks the live response against the
   single public mode. They must agree exactly on verdict +
   temperature band + required-fields flag + the settlement-time
   snapshot, or the call stays FUNDED and settlement can be retried.
   For a valid response the consensus-verified fields
   (temperature_2m, time, wind_speed_10m) are written into the call
   record as its snapshot; other verdicts carry no snapshot.
4. **Receipt.** Settlement records a pull-payment credit. The
   entitled party withdraws it. A buyer can cancel a FUNDED call for a
   full refund. The receipt shows the settlement-time snapshot read
   from the chain — the data the settlement was based on — and never
   re-fetches the endpoint.

Verdicts (deterministic code, no LLM anywhere):

| Verdict | Meaning | Money | Provider record |
|---------|---------|-------|-----------------|
| `RESPONSE_VALID` | Response matches the single public mode | Escrow pays the provider | — |
| `RESPONSE_INVALID` | Response does not match the mode | Full refund to the buyer | Violations +1 |
| `UNREACHABLE` | Endpoint cannot be fetched, or returns a non-200 response | Full refund to the buyer | No violation |

Temperature is a diagnostic only: it is stored as a 10 °C band
(`LT0 / 0_10 / 10_20 / 20_30 / GT30`) and never decides anything.
The settlement-time snapshot additionally records the exact
temperature_2m, time and wind_speed_10m from the consensus-verified
response, for display only — the snapshot never decides anything
either. A band flip at a boundary can only produce a consensus
disagreement and a retry — never a wrong settlement. The same
holds for a snapshot mismatch between validators.

## Contract

- Network: GenLayer Stable Studionet, Chain ID 61999
- Contract: `0xe0c8716f8f1D8C64c8bd3F1eD7d063AFa2bC2A9E`
- Protocol: `callsettle-1.3`
- Source: [`contracts/callsettle.py`](contracts/callsettle.py)
- Source SHA-256: `90c67e3e6c48a65cf5c0c665ab80e4bcd8aa5ea8a00cac99fe0dcadbc3c2fe97`
- Deploy tx: [`0xd99bcf5080aecb86f83ed295bed71ae2a3df2308ecb68f4d23d655bd9f2b40d9`](https://explorer-studio.genlayer.com/tx/0xd99bcf5080aecb86f83ed295bed71ae2a3df2308ecb68f4d23d655bd9f2b40d9)
- Explorer: https://explorer-studio.genlayer.com/address/0xe0c8716f8f1D8C64c8bd3F1eD7d063AFa2bC2A9E
- Byte parity: deployed code is byte-for-byte identical to the repo
  source — check with `node scripts/byte_parity.mjs`.
- Abandoned first v1.3 deploy (same protocol version, cannot settle):
  `0x2992e9f69e8aAfBCB0E25AD1B433B3b31C0a7eAf` — its consensus result
  carried a nested snapshot dict with floats, which the consensus
  layer cannot encode, so every settle crashed with `exit_code 1`.
  Closed out at balance 0 GEN (3 GEN in = 3 GEN out); details in
  [`evidence/v1.3-first-deploy/NOTES.md`](evidence/v1.3-first-deploy/NOTES.md).
  No transaction from it is used as evidence for this contract.
- Superseded v1.2 contract (protocol callsettle-1.2, now abandoned):
  `0x0ae3DeB61fA3f84FA15EA164a9B0F2E59469e265` — its evidence is
  archived in [`evidence/v1.2/`](evidence/v1.2/). v1.2's final state
  was 18 GEN in, 18 GEN withdrawn, 0 GEN balance.
- Superseded v1.1 contract (protocol callsettle-1.1, now abandoned):
  `0x58c71cDA976912e9F16438317dE7804523EFaEe6` — its evidence is
  archived in [`evidence/v1.1/`](evidence/v1.1/). v1.1's final state
  was 18 GEN in, 15 GEN withdrawn, 3 GEN balance — the 3 GEN is a
  provider credit to P1 whose evidence-run temporary key was
  deleted, so it is unrecoverable in practice (disclosed in
  `evidence/v1.1/NOTES.md`, not hidden).
- Superseded v1.0 contract (protocol callsettle-1, now abandoned):
  `0x445Fcd2bBCEbF42C7EE3946644ADdb64698E66E2` — its evidence is
  archived unchanged in [`evidence/v1/`](evidence/v1/).

Methods: `list_endpoint(url, price_gen, schema_note)`,
`call_api(endpoint_id)` (payable, exact price),
`settle_call(call_id)` (anyone), `cancel_call(call_id)` (buyer only,
FUNDED only), `withdraw(call_id)` (entitled party only),
`get_endpoint / get_all_endpoints / get_call / get_all_calls /
get_counts / get_protocol / get_limits`.

Limits (enforced in the contract): 1–10 GEN per call; at most 8
endpoints per provider, 32 total; URL ≤ 256 chars and must be
exactly `https://api.open-meteo.com/v1/forecast`, optionally
followed by a query string (a junk path after the forecast path is
rejected); schema note 10–280 chars.
The caps are consistent by construction (8 × 4 = 32).

## Evidence

- Pre-registered expectations: [`EXPECTED.md`](EXPECTED.md)
- Transactions: [`evidence/transactions.json`](evidence/transactions.json)
- Summary: [`EVIDENCE.md`](EVIDENCE.md)
- Reviewer entry point: [`REVIEWER.md`](REVIEWER.md)
- Demo endpoints: Open-Meteo public weather API (valid),
  an Open-Meteo forecast URL without a `current` field (invalid),
  an Open-Meteo forecast URL with latitude 999, which returns HTTP
  400 (unreachable).

Evidence run: 31 evidence transactions (+ 1 deploy tx), all
FINALIZED — 3 listings, 6 calls, 5 settlements, 1 cancel,
6 withdrawals, 10 on-chain negatives. Ledger (scripted run):
16 GEN in = 16 GEN out, escrow 0, 1 violation (the bad-mode
endpoint only), contract balance 0 GEN: no value stranded — every
failed-payable negative sent 0 GEN by design, and C6's provider
credit was withdrawn inside the run. The browser write loop (C8:
list, call, settle, withdraw — 4 more FINALIZED transactions,
pre-registered in EXPECTED.md) brings the final live state to
18 GEN in = 18 GEN out, balance 0 GEN. Testnet GEN only, zero
cash cost. The C8 settlement writes a settlement-time snapshot
into the call record; the receipt shows that snapshot read from
the chain.

Verify independently: `node scripts/verify_evidence.mjs` re-reads every
transaction live and re-checks the final readback against
`EXPECTED.md`. Mock tests: `python3 tests/test_callsettle_mock.py`.

## What this project does not prove

It does not prove an endpoint is business-correct (only that its
response matches the single public mode); it does not prove keyed endpoints
work; it does not prove temperature readings are accurate (temperature
decides nothing: the verdict uses only the response shape, and the
exact temperature is kept only as a settlement-time snapshot for
display). It does not guarantee the third-party API is always
available or that its responses stay the same over time — settlement verifies the response
validators fetched at settlement time. The snapshot is the record of
what a settlement was based on; the receipt shows the snapshot read
from the chain and never fetches the endpoint again. The schema note stored at
listing is provider-written text, checked only for length (10–280
chars); it is not verified, and the endpoint URL is the source of
truth.

## Known limits

- Open-Meteo weather endpoints only; an endpoint that needs an API key
  cannot be listed meaningfully, because validators fetch without
  credentials.
- v1.3 has no endpoint delist action: a listed endpoint stays ACTIVE.
  Providers cannot prevent new calls to a stale listing. Each new call
  is funded separately and checked against the live response; buyers
  should inspect the endpoint before funding it.
- Anyone can attempt settlement of a FUNDED call, and its buyer can
  cancel it while FUNDED. Settlement still requires a finalized
  consensus result; disagreement or network unavailability can delay
  release. Pull credits require the entitled account to withdraw.
- A temperature band can flip near a boundary value; a flip only
  produces a consensus disagreement and a retry.
- A settlement-time snapshot exists only for RESPONSE_VALID
  settlements. If the demo API is rate-limited when settlement runs,
  validators see no usable response and the call settles UNREACHABLE
  with no snapshot — that is the honest outcome, not a display
  failure. (On 2026-11-12 the v1.2 browser receipt failed to display
  a re-fetched response for exactly this reason: the shared browser
  network hit the free-tier daily limit, HTTP 429. v1.3 shows the
  on-chain snapshot instead, so the display no longer depends on
  the browser's network.)

## Run it locally

```sh
npm install
npm run build        # builds the site into docs/
npm test             # mock tests
node scripts/byte_parity.mjs
node scripts/verify_evidence.mjs
```

## Historical snapshot verification

The read-only verifier resolves each call’s endpoint from latest-final chain state and validates RESPONSE_VALID timestamps in that endpoint’s explicit IANA timezone. Historical snapshots do not expire. Nonexistent DST wall times, invalid calendar dates, non-finite/out-of-range temperatures, negative/non-finite wind, and inconsistent temperature bands are rejected. Repeated DST times retain both UTC candidates; without an offset, the stored wall clock does not identify one unique instant. This validates snapshot consistency, not the truth or provenance of the original weather measurement.

The deliberately unreachable E3 has no valid-response snapshot and needs no timezone; it still must resolve to a chain-read endpoint. Unknown verdicts or a missing endpoint fail validation. Wind remains optional under the deployed mode; no physical upper wind threshold is claimed. The contract source is unchanged.

Latest independent live verification: 114 PASS, 0 FAIL across 31 scripted and 4 browser transactions, plus the deployment receipt. Latest-final ledger: 18 GEN received, 18 withdrawn, zero balance/escrow. Details: [snapshot verification](evidence/snapshot-verification-2026-11-13.json). Existing transaction hashes and expectations are preserved.
