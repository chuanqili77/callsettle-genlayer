# EVIDENCE.md — CallSettle (protocol callsettle-1.1)

- Network: Stable Studionet, Chain ID 61999
- Contract: [0x58c71cDA976912e9F16438317dE7804523EFaEe6](https://explorer-studio.genlayer.com/address/0x58c71cDA976912e9F16438317dE7804523EFaEe6)
- Deploy tx: [0xeb68bda674c14e2e555cd92d372220d72b43448bcef404a17fd110da1cecf4a1](https://explorer-studio.genlayer.com/tx/0xeb68bda674c14e2e555cd92d372220d72b43448bcef404a17fd110da1cecf4a1)
- Source: `contracts/callsettle.py` (16755 bytes)
- Source SHA-256: `abc7fe77b13a64f705b27817b5ea9df8cc1bcd86e4c81acb5e23b3bd274f4908`
- Byte parity: deployed code is byte-for-byte identical to the repo source
  (`node scripts/byte_parity.mjs`).
- Evidence run: 27 transactions recorded
  (18 ok, 9 error-observed, 0 disagreed-retry),
  all FINALIZED. Independent verification: `node scripts/verify_evidence.mjs`
  re-reads every transaction live and re-checks the readback below.
- Expectations were pre-registered in EXPECTED.md before the run; every
  outcome below matched.

## Final readback (latest-final)

```json
{
  "calls": [
    {
      "buyer": "0xe6016ed17798cd9fa6fef2975087663b21e135f3",
      "buyer_credit": 0,
      "buyer_withdrawn": false,
      "call_id": 1,
      "endpoint_id": 1,
      "has_required_fields": true,
      "price_gen": 3,
      "price_wei": 3000000000000000000,
      "provider": "0x1535afc1f57f5bc886b98725de455df24a266238",
      "provider_credit": 3000000000000000000,
      "provider_withdrawn": true,
      "status": "SETTLED",
      "temperature_band": "0_10",
      "verdict": "RESPONSE_VALID"
    },
    {
      "buyer": "0x1fb8eb7fe7810a3a6c20afea351960288787ac19",
      "buyer_credit": 0,
      "buyer_withdrawn": false,
      "call_id": 2,
      "endpoint_id": 1,
      "has_required_fields": true,
      "price_gen": 3,
      "price_wei": 3000000000000000000,
      "provider": "0x1535afc1f57f5bc886b98725de455df24a266238",
      "provider_credit": 3000000000000000000,
      "provider_withdrawn": true,
      "status": "SETTLED",
      "temperature_band": "0_10",
      "verdict": "RESPONSE_VALID"
    },
    {
      "buyer": "0xe6016ed17798cd9fa6fef2975087663b21e135f3",
      "buyer_credit": 2000000000000000000,
      "buyer_withdrawn": true,
      "call_id": 3,
      "endpoint_id": 2,
      "has_required_fields": false,
      "price_gen": 2,
      "price_wei": 2000000000000000000,
      "provider": "0x1535afc1f57f5bc886b98725de455df24a266238",
      "provider_credit": 0,
      "provider_withdrawn": false,
      "status": "REFUNDED",
      "temperature_band": "NONE",
      "verdict": "RESPONSE_INVALID"
    },
    {
      "buyer": "0x1fb8eb7fe7810a3a6c20afea351960288787ac19",
      "buyer_credit": 2000000000000000000,
      "buyer_withdrawn": true,
      "call_id": 4,
      "endpoint_id": 3,
      "has_required_fields": false,
      "price_gen": 2,
      "price_wei": 2000000000000000000,
      "provider": "0x1535afc1f57f5bc886b98725de455df24a266238",
      "provider_credit": 0,
      "provider_withdrawn": false,
      "status": "REFUNDED",
      "temperature_band": "NONE",
      "verdict": "UNREACHABLE"
    },
    {
      "buyer": "0xe6016ed17798cd9fa6fef2975087663b21e135f3",
      "buyer_credit": 3000000000000000000,
      "buyer_withdrawn": true,
      "call_id": 5,
      "endpoint_id": 1,
      "has_required_fields": false,
      "price_gen": 3,
      "price_wei": 3000000000000000000,
      "provider": "0x1535afc1f57f5bc886b98725de455df24a266238",
      "provider_credit": 0,
      "provider_withdrawn": false,
      "status": "CANCELLED",
      "temperature_band": "",
      "verdict": ""
    }
  ],
  "endpoints": [
    {
      "calls": 3,
      "endpoint_id": 1,
      "price_gen": 3,
      "price_wei": 3000000000000000000,
      "provider": "0x1535afc1f57f5bc886b98725de455df24a266238",
      "schema_note": "Single public mode: HTTP 200, JSON, current.temperature_2m is a number in -60..60, current.time is a string. Berlin current weather, no key.",
      "settled_valid": 2,
      "status": "ACTIVE",
      "url": "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m&timezone=Europe%2FBerlin",
      "violations": 0
    },
    {
      "calls": 1,
      "endpoint_id": 2,
      "price_gen": 2,
      "price_wei": 2000000000000000000,
      "provider": "0x1535afc1f57f5bc886b98725de455df24a266238",
      "schema_note": "Single public mode (same as the good endpoint). This forecast URL returns HTTP 200 JSON without a current field, so it must settle RESPONSE_INVALID.",
      "settled_valid": 0,
      "status": "ACTIVE",
      "url": "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&timezone=Europe%2FBerlin",
      "violations": 1
    },
    {
      "calls": 1,
      "endpoint_id": 3,
      "price_gen": 2,
      "price_wei": 2000000000000000000,
      "provider": "0x1535afc1f57f5bc886b98725de455df24a266238",
      "schema_note": "Single public mode (same as the good endpoint). This forecast URL returns HTTP 400 (latitude out of range), so it must settle UNREACHABLE.",
      "settled_valid": 0,
      "status": "ACTIVE",
      "url": "https://api.open-meteo.com/v1/forecast?latitude=999&longitude=999",
      "violations": 0
    }
  ],
  "counts": {
    "call_count": 5,
    "contract_balance_wei": 0,
    "endpoint_count": 3,
    "escrowed_wei": 0,
    "total_received_wei": 13000000000000000000,
    "total_violations": 1,
    "total_withdrawn_wei": 13000000000000000000
  }
}
```

## Ledger (exact)

- GEN in through the contract's accounting: 13 (calls C1–C5: 3 + 3 + 2 + 2 + 3)
- GEN out through the contract's accounting: 13 (provider 6 + buyers 7)
- Escrow: 0 GEN, total violations: 1 (endpoint E2 only)
- Contract balance: 0 GEN. No value stranded: every failed-payable
  negative in v1.1 sent 0 GEN by design. (Platform behavior, stated
  honestly in the contract docstring: a failed payable call keeps its
  value in the contract on Studionet — v1.0 stranded 3 GEN that way,
  which is why v1.1 negatives carry no value.) Testnet GEN only,
  zero cash cost.

## Transactions

| Label | Tx | Result |
|-------|----|--------|
| e1-list-good | [0xa3cfe81e…](https://explorer-studio.genlayer.com/tx/0xa3cfe81ebaf9959fd5293ce59eb3e85d646e2d69820b46a887d673712faec8e4) | ok |
| e2-list-bad | [0x7b60f200…](https://explorer-studio.genlayer.com/tx/0x7b60f20040335986649b61fd3c2afa5231f39cc9731f9ea6facc321ce5e2fcf2) | ok |
| e3-list-unreachable | [0xccfb878d…](https://explorer-studio.genlayer.com/tx/0xccfb878d1ac4f912214397c875d3d170ed013c09883121845a02d088a3d9349a) | ok |
| c1-call | [0x2d0b37e2…](https://explorer-studio.genlayer.com/tx/0x2d0b37e2849e8b635f841ebe6b8124d8e1af720ea2b4cd4b7d413ef4fa167f92) | ok |
| c1-settle | [0x93eceac8…](https://explorer-studio.genlayer.com/tx/0x93eceac86bf0af495398fe5a1fe02569499ea43cafa4c342f525cccaeb0574e9) | ok · verdict RESPONSE_VALID (0_10) |
| c2-call | [0xe727fa15…](https://explorer-studio.genlayer.com/tx/0xe727fa158188bac971c135d2114a8cc3d10fe979e16849a3fd8eebf87a4fb7b6) | ok |
| c2-settle | [0x786b0e7f…](https://explorer-studio.genlayer.com/tx/0x786b0e7f5aa6ab32ec5e562463d757a95476389722ad1e8dd485180f518fed78) | ok · verdict RESPONSE_VALID (0_10) |
| c3-call | [0x3143f7d5…](https://explorer-studio.genlayer.com/tx/0x3143f7d500f6522c038154b593b2b93c9ba5dd21e6ae48b722e15403c1210549) | ok |
| c3-settle | [0xafea0f3a…](https://explorer-studio.genlayer.com/tx/0xafea0f3a611365bcbe4b10cdd7c79fbc5ff4dd6e648d1c0867cc3459d9e5210b) | ok · verdict RESPONSE_INVALID (NONE) |
| c4-call | [0x9e15df15…](https://explorer-studio.genlayer.com/tx/0x9e15df150d34286a580c3b6a9348f5b052d15a3d865907c0ce7308dbd28577e0) | ok |
| c4-settle | [0x1816213c…](https://explorer-studio.genlayer.com/tx/0x1816213c90153d2fa322c476453f17a282af7a2825577798bd293d154b7b0003) | ok · verdict UNREACHABLE (NONE) |
| c5-call | [0x10b87f22…](https://explorer-studio.genlayer.com/tx/0x10b87f22b223cf16743cfd4944f41a0c3e92d5c6efc56d9df48f74db277d0695) | ok |
| neg0-stranger-cancel | [0x4db1b4bf…](https://explorer-studio.genlayer.com/tx/0x4db1b4bff2642789a329ad42e1e5140719b6799b4f08c4f9f8bfc55f2a76f6ce) | error-observed · error ONLY_BUYER_CAN_CANCEL |
| c5-cancel | [0xd19ac4eb…](https://explorer-studio.genlayer.com/tx/0xd19ac4eb1c76737384d239e6244a13ac616602775696a079d0251a874238c6ee) | ok |
| neg5-stranger-withdraw | [0x024dd11e…](https://explorer-studio.genlayer.com/tx/0x024dd11e6afa0f2311b24ea5a2bb4c8007f75df1d2bc0bc9c1b5923798371c69) | error-observed · error NO_CREDIT |
| c1-provider-withdraw | [0xd5ee34a3…](https://explorer-studio.genlayer.com/tx/0xd5ee34a3cc64ff097e3200c5769243ee21063730630f77fa6a9f36ccc9b9eb22) | ok |
| c2-provider-withdraw | [0x8a7f1fc3…](https://explorer-studio.genlayer.com/tx/0x8a7f1fc3229346388fe37a0051b58237577bcd7f2b386a94614d34303cdd658f) | ok |
| c3-buyer-withdraw | [0xf995c33d…](https://explorer-studio.genlayer.com/tx/0xf995c33dd145680e1a77c9930abbe1127c8cd068f6d2c5b77f3da7c68fd878ad) | ok |
| c4-buyer-withdraw | [0x05cc2344…](https://explorer-studio.genlayer.com/tx/0x05cc2344cc44ffbc2d49129d0596a8c86577d8c4c7d0e1be9cb075a2ccda6cdb) | ok |
| c5-buyer-withdraw | [0xc2024b5a…](https://explorer-studio.genlayer.com/tx/0xc2024b5a623bb3a40b4d47d8eeace6f0e180192f60bba5cdcb2262ee5b319d9e) | ok |
| neg6-double-withdraw | [0x816b49e9…](https://explorer-studio.genlayer.com/tx/0x816b49e935567b8c453c03679266efee7424e4f14b07792120d5a97d33c2121d) | error-observed · error NO_CREDIT |
| neg1-double-settle | [0x424fc416…](https://explorer-studio.genlayer.com/tx/0x424fc416e37568fbd6468e57f0360266f1c4c12442ce28b734b74b15a532aaa4) | error-observed · error CALL_NOT_FUNDED |
| neg2-call-unknown-endpoint | [0xc2cf2278…](https://explorer-studio.genlayer.com/tx/0xc2cf2278b0ce0bb9f6242078461a9aa0a4c8a79f08e7815c91cbabf20fd2377d) | error-observed · error ENDPOINT_NOT_FOUND |
| neg3-list-price-zero | [0x249e34a0…](https://explorer-studio.genlayer.com/tx/0x249e34a03a579c705aa4fc3153c14307ae69a920c7d5bb7214e677db96512a24) | error-observed · error PRICE |
| neg4-list-price-eleven | [0xf581dcda…](https://explorer-studio.genlayer.com/tx/0xf581dcda4aa4348e30dfddb2191b6e90d4b350f3830a0afee780b59048bc418b) | error-observed · error PRICE |
| neg7-list-non-openmeteo-url | [0x3364089d…](https://explorer-studio.genlayer.com/tx/0x3364089d64144ba50a1ea30b3cb1d3d18b315067186c1c13d07329444b63e17f) | error-observed · error URL_HOST |
| neg8-call-wrong-value | [0xdd021afa…](https://explorer-studio.genlayer.com/tx/0xdd021afaef3742599b5dcec10e8b1b34265e5434dc6a14b3350f37b0b66b5c6a) | error-observed · error VALUE_MUST_EQUAL_PRICE |

## Adversarial cases (all on-chain)

| Case | Expected | Actual |
|------|----------|--------|
| Stranger cancels another buyer's FUNDED call (neg0) | ONLY_BUYER_CAN_CANCEL, state unchanged | error-observed, see table |
| Double-settle an already SETTLED call (neg1) | CALL_NOT_FUNDED, state unchanged | error-observed, see table |
| Call a nonexistent endpoint, 0 GEN sent (neg2) | ENDPOINT_NOT_FOUND, no value stranded | error-observed, see table |
| List an endpoint at price 0 / 11 GEN (neg3/neg4) | PRICE | error-observed, see table |
| Stranger withdraws another party's credit (neg5) | NO_CREDIT, state unchanged | error-observed, see table |
| Double-withdraw an already withdrawn credit (neg6) | NO_CREDIT, state unchanged | error-observed, see table |
| List a non-Open-Meteo URL (neg7) | URL_HOST, state unchanged | error-observed, see table |
| Call an existing endpoint with 0 GEN instead of the exact price (neg8) | VALUE_MUST_EQUAL_PRICE, no value stranded | error-observed, see table |
| Bad-mode endpoint (E2, Open-Meteo forecast without a current field) | RESPONSE_INVALID, buyer refunded, violations +1 | settled INVALID, see C3 |
| Unreachable endpoint (E3, Open-Meteo forecast with latitude 999, HTTP 400) | UNREACHABLE, buyer refunded, no violation | settled UNREACHABLE, see C4 |
| Injection text inside a response body | Verdict follows the JSON schema only; instruction text cannot flip it | Mock test in tests/test_callsettle_mock.py (deterministic check, no LLM in the path) |

## Browser write loops (C6 + C7, pre-registered in EXPECTED.md before each run)

Both runs used the live site in a real browser with the site's own
in-browser temporary test accounts (never presented as wallet
signatures). Hashes also live in `public/browser-transactions.json`
so the receipts on the site link them; every hash below was re-read
live and confirmed FINALIZED with leader SUCCESS.

| Step | Tx | Result |
|------|----|--------|
| C6 buy call on E1 (buyer 0xc7ec…9ea6, 3 GEN) | [0x7ed54f77…](https://explorer-studio.genlayer.com/tx/0x7ed54f7739afbfcfa3be5b13ab328d32e96c6e515c9caf3cf0fb0f3036920a88) | ok · call 6, FUNDED |
| C6 settle call 6 | [0xb84e7a70…](https://explorer-studio.genlayer.com/tx/0xb84e7a70973e8fb1274ba2a91b53eb4de0c8b537d0188ef4c4415624cdbae1b8) | ok · RESPONSE_VALID (0_10), provider_credit 3 GEN |
| C7 list E4 London (provider 0xa7cb…057c, 2 GEN) | [0xc6c41f9f…](https://explorer-studio.genlayer.com/tx/0xc6c41f9fa9d18665f2daef4636a0dcfc03813cccb1a6985398b66f183b906490) | ok · endpoint 4, ACTIVE |
| C7 buy call on E4 (same temp account, 2 GEN) | [0xb8679ff7…](https://explorer-studio.genlayer.com/tx/0xb8679ff71542e97805d53890614a4749b6b751c5b11d88a2a8427e0ccc9c4bc5) | ok · call 7, FUNDED |
| C7 settle call 7 | [0x2f9e84c9…](https://explorer-studio.genlayer.com/tx/0x2f9e84c9e56c26df1d306594dbbed555b189b49e4ebc7201d202a0ea0c7b4407) | ok · RESPONSE_VALID (0_10), provider_credit 2 GEN |
| C7 withdraw provider credit (in-browser button) | [0xfcd6a1e6…](https://explorer-studio.genlayer.com/tx/0xfcd6a1e69420d7530b957e186e39ade926b4722fbb77e33805e11d4fb0f00f2c) | ok · 2 GEN withdrawn, receipt shows Withdrawn |

Cold start (real browser, both passes): page renders in English by
default; before any FINALIZED readback the meter shows dashes +
UNCONFIRMED and export is disabled; no VERIFIED/success styling or
payout number appears before a readback. Second pass also confirmed
the fixed receipt detail shows real tx hashes (no "UNCONFIRMED",
no "Tx hashUNCONFIRMED"), no viem error line on the happy path, and
the account panel requires an in-page disconnect confirmation.
One first-load stall was observed in pass 2 (readback stuck 7+
minutes, fixed by one reload); the readback path now races each RPC
call against a 30s timeout with retries. 375px: this browser has no
viewport-resize control, so scrollWidth could not be measured; at
500% zoom (≈384 CSS px) the whole page showed no horizontal
overflow, cut-off or overlap.

## Final live ledger (after C6 + C7)

- GEN in: 18 (13 scripted + 3 C6 + 2 C7)
- GEN withdrawn on-chain: 15 (13 scripted + 2 C7 provider withdraw)
- Contract balance: 3 GEN = C6's provider credit to P1
  (0x1535afc1f57f5bc886b98725de455df24a266238), whose evidence-run
  temporary key was deleted after the evidence run. The credit is
  unrecoverable in practice: escrowed is exactly 3 GEN, and
  withdrawal of a provider credit in the browser is proven by C7.
  Testnet GEN only, zero cash cost.
- Escrowed: 3 GEN, total violations: 1 (endpoint E2 only)
- E1: settled_valid 3, violations 0. E4: settled_valid 1, violations 0.
- Calls: 7, endpoints: 4.
