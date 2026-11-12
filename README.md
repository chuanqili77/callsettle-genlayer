# CallSettle — Pay per API call, settled by consensus

Live site: https://chuanqili77.github.io/callsettle-genlayer/

A buyer escrows payment for one API call. Validators independently
fetch the provider's public endpoint and judge the live response
against the single public mode (Open-Meteo weather response: HTTP
200, JSON, `current.temperature_2m` a number in −60..60,
`current.time` a string). Valid pays the provider; invalid or
unreachable refunds the buyer. No middleman — just a receipt.

v1.2 is a single-mode market: every listed endpoint is an
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
   temperature band + required-fields flag, or the call stays FUNDED
   and settlement can be retried.
4. **Receipt.** Settlement records a pull-payment credit. The
   entitled party withdraws it. A buyer can cancel a FUNDED call for a
   full refund.

Verdicts (deterministic code, no LLM anywhere):

| Verdict | Meaning | Money | Provider record |
|---------|---------|-------|-----------------|
| `RESPONSE_VALID` | Response matches the single public mode | Escrow pays the provider | — |
| `RESPONSE_INVALID` | Response does not match the mode | Full refund to the buyer | Violations +1 |
| `UNREACHABLE` | Endpoint cannot be fetched, or returns a non-200 response | Full refund to the buyer | No violation |

Temperature is a diagnostic only: it is stored as a 10 °C band
(`LT0 / 0_10 / 10_20 / 20_30 / GT30`), never as a float, never as a
decision field. A band flip at a boundary can only produce a consensus
disagreement and a retry — never a wrong settlement.

## Contract

- Network: GenLayer Stable Studionet, Chain ID 61999
- Contract: `0x0ae3DeB61fA3f84FA15EA164a9B0F2E59469e265`
- Protocol: `callsettle-1.2`
- Source: [`contracts/callsettle.py`](contracts/callsettle.py)
- Source SHA-256: `3271ff330e97b64a3a2977f630beceb6cf00a70975834ea08aa90a4405973fd2`
- Deploy tx: [`0xcbed0469e2410972a5529febe9ba9088c82c5aa54081e9998f0f2cccf60323eb`](https://explorer-studio.genlayer.com/tx/0xcbed0469e2410972a5529febe9ba9088c82c5aa54081e9998f0f2cccf60323eb)
- Explorer: https://explorer-studio.genlayer.com/address/0x0ae3DeB61fA3f84FA15EA164a9B0F2E59469e265
- Byte parity: deployed code is byte-for-byte identical to the repo
  source — check with `node scripts/byte_parity.mjs`.
- Superseded v1.2 first deployment (same source, abandoned):
  `0xF183E90Ea3C2Af4DcD54eeB6a2595732A80AC9e8` — its evidence run
  stalled on a network-level stuck transaction (see
  [`evidence/v1.2-first-deploy/NOTES.md`](evidence/v1.2-first-deploy/NOTES.md)).
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
credit was withdrawn inside the run. The browser write loop (C7:
list, call, settle, withdraw — 4 more FINALIZED transactions,
pre-registered in EXPECTED.md) brings the final live state to
18 GEN in = 18 GEN out, balance 0 GEN. Testnet GEN only, zero
cash cost.

Verify independently: `node scripts/verify_evidence.mjs` re-reads every
transaction live and re-checks the final readback against
`EXPECTED.md`. Mock tests: `python3 tests/test_callsettle_mock.py`.
Clean public text (other-project names, internal agent language,
internal process terms, work-directory paths) is checked
mechanically before every push: `npm run check-clean`.

## What this project does not prove

It does not prove an endpoint is business-correct (only that its
response matches the single public mode); it does not prove keyed endpoints
work; it does not prove temperature readings are accurate (temperature
is stored only as a 10 °C band and never decides anything). It does
not guarantee the third-party API is always available or that its
responses stay the same over time — settlement verifies the response
validators fetched at settlement time. The schema note stored at
listing is provider-written text, checked only for length (10–280
chars); it is not verified, and the endpoint URL is the source of
truth.

## Known limits

- Open-Meteo weather endpoints only; an endpoint that needs an API key
  cannot be listed meaningfully, because validators fetch without
  credentials.
- v1.2 has no endpoint delist action: a listed endpoint stays ACTIVE.
  A provider that wants to stop selling simply stops being called; no
  funds are at risk from a stale listing because every call is paid
  per call and settled against the live response.
- A call left FUNDED whose buyer disappears can still be settled by
  anyone, so funds are never stuck; the buyer can also cancel it
  while FUNDED.
- A temperature band can flip near a boundary value; a flip only
  produces a consensus disagreement and a retry.

## Run it locally

```sh
npm install
npm run build        # builds the site into docs/
npm test             # mock tests
npm run check-clean  # banned phrases in public files (must pass before push)
node scripts/byte_parity.mjs
node scripts/verify_evidence.mjs
```
