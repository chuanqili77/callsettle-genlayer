# CallSettle — Pay per API call, settled by consensus

Live site: https://chuanqili77.github.io/callsettle-genlayer/

A buyer escrows payment for one API call. Validators independently
fetch the provider's public endpoint and judge the live response
against the schema agreed on-chain at listing. Valid pays the
provider; invalid or unreachable refunds the buyer. No middleman —
just a receipt.

## How it works

1. **List.** A provider lists a public, keyless API endpoint with a
   per-call price (1–10 GEN) and a response-schema note. The schema is
   the settlement rule: HTTP 200, JSON, `current.temperature_2m` a
   number in −60..60, `current.time` a string.
2. **Call.** A buyer pays the exact price for one call. The payment is
   escrowed; the call is FUNDED.
3. **Settle.** Anyone triggers settlement. Each validator fetches the
   endpoint independently and checks the live response against the
   agreed schema. They must agree exactly on verdict +
   temperature band + required-fields flag, or the call stays FUNDED
   and settlement can be retried.
4. **Receipt.** Settlement records a pull-payment credit. The
   entitled party withdraws it. A buyer can cancel a FUNDED call for a
   full refund.

Verdicts (deterministic code, no LLM anywhere):

| Verdict | Meaning | Money | Provider record |
|---------|---------|-------|-----------------|
| `RESPONSE_VALID` | Response matches the agreed schema | Escrow pays the provider | — |
| `RESPONSE_INVALID` | Response does not match the schema | Full refund to the buyer | Violations +1 |
| `UNREACHABLE` | Endpoint cannot be fetched | Full refund to the buyer | No violation |

Temperature is a diagnostic only: it is stored as a 10 °C band
(`LT0 / 0_10 / 10_20 / 20_30 / GT30`), never as a float, never as a
decision field. A band flip at a boundary can only produce a consensus
disagreement and a retry — never a wrong settlement.

## Contract

- Network: GenLayer Stable Studionet, Chain ID 61999
- Contract: `0x445Fcd2bBCEbF42C7EE3946644ADdb64698E66E2`
- Protocol: `callsettle-1`
- Source: [`contracts/callsettle.py`](contracts/callsettle.py)
- Source SHA-256: `31d4db85b85680d08d8a697642fd5579d633f88c911c940c25e940a5f2fd551b`
- Deploy tx: [`0x78b128620a88b2e4e65a7bcf43057b72f8b66f7d656f1af7a1fda969956ad24c`](https://explorer-studio.genlayer.com/tx/0x78b128620a88b2e4e65a7bcf43057b72f8b66f7d656f1af7a1fda969956ad24c)
- Explorer: https://explorer-studio.genlayer.com/address/0x445Fcd2bBCEbF42C7EE3946644ADdb64698E66E2
- Byte parity: deployed code is byte-for-byte identical to the repo
  source — check with `node scripts/byte_parity.mjs`.

Methods: `list_endpoint(url, price_gen, schema_note)`,
`call_api(endpoint_id)` (payable, exact price),
`settle_call(call_id)` (anyone), `cancel_call(call_id)` (buyer only,
FUNDED only), `withdraw(call_id)` (entitled party only),
`get_endpoint / get_all_endpoints / get_call / get_all_calls /
get_counts / get_protocol / get_limits`.

Limits (enforced in the contract): 1–10 GEN per call; at most 8
endpoints per provider, 32 total; URL ≤ 256 chars; schema note 10–280
chars. The caps are consistent by construction (8 × 4 = 32).

## Evidence

- Pre-registered expectations: [`EXPECTED.md`](EXPECTED.md)
- Transactions: [`evidence/transactions.json`](evidence/transactions.json)
- Summary: [`EVIDENCE.md`](EVIDENCE.md)
- Reviewer entry point: [`REVIEWER.md`](REVIEWER.md)
- Demo endpoints: Open-Meteo public weather API (valid),
  `https://httpbin.org/json` (HTTP 200 but no `current` field —
  invalid), an unresolvable host (unreachable).

Evidence run: 26 transactions, all FINALIZED — 3 listings, 5 calls,
4 settlements, 1 cancel, 5 withdrawals, 7 on-chain negatives.
Ledger: 13 GEN in = 13 GEN out, escrow 0, 1 violation (the bad-schema endpoint only).
Contract balance is 3 GEN: the failed payable neg2 (call to a
nonexistent endpoint) kept its 3 GEN value — platform behavior, disclosed
in [`EVIDENCE.md`](EVIDENCE.md). Testnet GEN only, zero cash cost.

Verify independently: `node scripts/verify_evidence.mjs` re-reads every
transaction live and re-checks the final readback against
`EXPECTED.md`. Mock tests: `python3 tests/test_callsettle_mock.py`.

## What this project does not prove

It does not prove an endpoint is business-correct (only that its
response matches the agreed schema); it does not prove keyed endpoints
work; it does not prove temperature readings are accurate (temperature
is stored only as a 10 °C band and never decides anything).

## Known limits

- Public, keyless endpoints only; an endpoint that needs an API key
  cannot be listed meaningfully, because validators fetch without
  credentials.
- v1 has no endpoint delist action: a listed endpoint stays ACTIVE.
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
node scripts/byte_parity.mjs
node scripts/verify_evidence.mjs
```
