# CallSettle — Pay per API call, settled by consensus

Live site: https://chuanqili77.github.io/callsettle-genlayer/

A buyer escrows payment for one API call. Validators independently
fetch the provider's public endpoint and judge the live response
against the single public mode (Open-Meteo weather response: HTTP
200, JSON, `current.temperature_2m` a number in −60..60,
`current.time` a string). Valid pays the provider; invalid or
unreachable refunds the buyer. No middleman — just a receipt.

v1.1 is a single-mode market: every listed endpoint is an
Open-Meteo forecast endpoint — `list_endpoint` rejects any URL that
does not start with `https://api.open-meteo.com/v1/forecast`
(error `URL_HOST`). Providers compete on per-call price. The
schema note stored at listing is a human-readable description of
this single mode, not a per-endpoint settlement rule.

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
- Contract: `0x58c71cDA976912e9F16438317dE7804523EFaEe6`
- Protocol: `callsettle-1.1`
- Source: [`contracts/callsettle.py`](contracts/callsettle.py)
- Source SHA-256: `abc7fe77b13a64f705b27817b5ea9df8cc1bcd86e4c81acb5e23b3bd274f4908`
- Deploy tx: [`0xeb68bda674c14e2e555cd92d372220d72b43448bcef404a17fd110da1cecf4a1`](https://explorer-studio.genlayer.com/tx/0xeb68bda674c14e2e555cd92d372220d72b43448bcef404a17fd110da1cecf4a1)
- Explorer: https://explorer-studio.genlayer.com/address/0x58c71cDA976912e9F16438317dE7804523EFaEe6
- Byte parity: deployed code is byte-for-byte identical to the repo
  source — check with `node scripts/byte_parity.mjs`.
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
endpoints per provider, 32 total; URL ≤ 256 chars and must start with
`https://api.open-meteo.com/v1/forecast`; schema note 10–280 chars.
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

Evidence run: 28 transactions, all FINALIZED — 3 listings, 5 calls,
4 settlements, 1 cancel, 5 withdrawals, 9 on-chain negatives.
Ledger: 13 GEN in = 13 GEN out, escrow 0, 1 violation (the bad-mode
endpoint only). Contract balance 0 GEN: no value stranded — every
failed-payable negative sent 0 GEN by design. Testnet GEN only, zero
cash cost.

Verify independently: `node scripts/verify_evidence.mjs` re-reads every
transaction live and re-checks the final readback against
`EXPECTED.md`. Mock tests: `python3 tests/test_callsettle_mock.py`.

## What this project does not prove

It does not prove an endpoint is business-correct (only that its
response matches the single public mode); it does not prove keyed endpoints
work; it does not prove temperature readings are accurate (temperature
is stored only as a 10 °C band and never decides anything).

## Known limits

- Open-Meteo weather endpoints only; an endpoint that needs an API key
  cannot be listed meaningfully, because validators fetch without
  credentials.
- v1.1 has no endpoint delist action: a listed endpoint stays ACTIVE.
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
