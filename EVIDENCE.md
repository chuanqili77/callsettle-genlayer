# EVIDENCE.md — CallSettle (protocol callsettle-1.2)

- Network: Stable Studionet, Chain ID 61999
- Contract: [0x0ae3DeB61fA3f84FA15EA164a9B0F2E59469e265](https://explorer-studio.genlayer.com/address/0x0ae3DeB61fA3f84FA15EA164a9B0F2E59469e265)
- Deploy tx: [0xcbed0469e2410972a5529febe9ba9088c82c5aa54081e9998f0f2cccf60323eb](https://explorer-studio.genlayer.com/tx/0xcbed0469e2410972a5529febe9ba9088c82c5aa54081e9998f0f2cccf60323eb)
- Source: `contracts/callsettle.py` (17175 bytes)
- Source SHA-256: `3271ff330e97b64a3a2977f630beceb6cf00a70975834ea08aa90a4405973fd2`
- Byte parity: deployed code is byte-for-byte identical to the repo source
  (`node scripts/byte_parity.mjs`).
- Evidence run: 31 transactions recorded
  (21 ok, 10 error-observed, 0 disagreed-retry),
  all FINALIZED. Browser write loop: 4 transactions
  recorded in `docs/browser-transactions.json`. Independent verification:
  `node scripts/verify_evidence.mjs` re-reads every transaction live
  and re-checks the readback below.
- Expectations were pre-registered in EXPECTED.md before the run; every
  outcome below matched.

## Final readback (latest-final, generated from live state at 2026-11-12T07:42:34.555Z)

```json
{
  "calls": [
    {
      "buyer": "0x11257bc090b9a86488979666b67639fab1a7cd6d",
      "buyer_credit": 0,
      "buyer_withdrawn": false,
      "call_id": 1,
      "endpoint_id": 1,
      "has_required_fields": true,
      "price_gen": 3,
      "price_wei": 3000000000000000000,
      "provider": "0x39cca217905e3c4f8164d407026d0b992d33d312",
      "provider_credit": 3000000000000000000,
      "provider_withdrawn": true,
      "status": "SETTLED",
      "temperature_band": "0_10",
      "verdict": "RESPONSE_VALID"
    },
    {
      "buyer": "0x857f9b05e5d97f314bc22baed6041e8b1ec4286c",
      "buyer_credit": 0,
      "buyer_withdrawn": false,
      "call_id": 2,
      "endpoint_id": 1,
      "has_required_fields": true,
      "price_gen": 3,
      "price_wei": 3000000000000000000,
      "provider": "0x39cca217905e3c4f8164d407026d0b992d33d312",
      "provider_credit": 3000000000000000000,
      "provider_withdrawn": true,
      "status": "SETTLED",
      "temperature_band": "0_10",
      "verdict": "RESPONSE_VALID"
    },
    {
      "buyer": "0x11257bc090b9a86488979666b67639fab1a7cd6d",
      "buyer_credit": 2000000000000000000,
      "buyer_withdrawn": true,
      "call_id": 3,
      "endpoint_id": 2,
      "has_required_fields": false,
      "price_gen": 2,
      "price_wei": 2000000000000000000,
      "provider": "0x39cca217905e3c4f8164d407026d0b992d33d312",
      "provider_credit": 0,
      "provider_withdrawn": false,
      "status": "REFUNDED",
      "temperature_band": "NONE",
      "verdict": "RESPONSE_INVALID"
    },
    {
      "buyer": "0x857f9b05e5d97f314bc22baed6041e8b1ec4286c",
      "buyer_credit": 2000000000000000000,
      "buyer_withdrawn": true,
      "call_id": 4,
      "endpoint_id": 3,
      "has_required_fields": false,
      "price_gen": 2,
      "price_wei": 2000000000000000000,
      "provider": "0x39cca217905e3c4f8164d407026d0b992d33d312",
      "provider_credit": 0,
      "provider_withdrawn": false,
      "status": "REFUNDED",
      "temperature_band": "NONE",
      "verdict": "UNREACHABLE"
    },
    {
      "buyer": "0x11257bc090b9a86488979666b67639fab1a7cd6d",
      "buyer_credit": 3000000000000000000,
      "buyer_withdrawn": true,
      "call_id": 5,
      "endpoint_id": 1,
      "has_required_fields": false,
      "price_gen": 3,
      "price_wei": 3000000000000000000,
      "provider": "0x39cca217905e3c4f8164d407026d0b992d33d312",
      "provider_credit": 0,
      "provider_withdrawn": false,
      "status": "CANCELLED",
      "temperature_band": "",
      "verdict": ""
    },
    {
      "buyer": "0x11257bc090b9a86488979666b67639fab1a7cd6d",
      "buyer_credit": 0,
      "buyer_withdrawn": false,
      "call_id": 6,
      "endpoint_id": 1,
      "has_required_fields": true,
      "price_gen": 3,
      "price_wei": 3000000000000000000,
      "provider": "0x39cca217905e3c4f8164d407026d0b992d33d312",
      "provider_credit": 3000000000000000000,
      "provider_withdrawn": true,
      "status": "SETTLED",
      "temperature_band": "0_10",
      "verdict": "RESPONSE_VALID"
    },
    {
      "buyer": "0xebe057fdd4dbe105dba26706ad079089cb502574",
      "buyer_credit": 0,
      "buyer_withdrawn": false,
      "call_id": 7,
      "endpoint_id": 4,
      "has_required_fields": true,
      "price_gen": 2,
      "price_wei": 2000000000000000000,
      "provider": "0xebe057fdd4dbe105dba26706ad079089cb502574",
      "provider_credit": 2000000000000000000,
      "provider_withdrawn": true,
      "status": "SETTLED",
      "temperature_band": "0_10",
      "verdict": "RESPONSE_VALID"
    }
  ],
  "endpoints": [
    {
      "calls": 4,
      "endpoint_id": 1,
      "price_gen": 3,
      "price_wei": 3000000000000000000,
      "provider": "0x39cca217905e3c4f8164d407026d0b992d33d312",
      "schema_note": "Single public mode: HTTP 200, JSON, current.temperature_2m is a number in -60..60, current.time is a string. Berlin current weather, no key.",
      "settled_valid": 3,
      "status": "ACTIVE",
      "url": "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m&timezone=Europe%2FBerlin",
      "violations": 0
    },
    {
      "calls": 1,
      "endpoint_id": 2,
      "price_gen": 2,
      "price_wei": 2000000000000000000,
      "provider": "0x39cca217905e3c4f8164d407026d0b992d33d312",
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
      "provider": "0x39cca217905e3c4f8164d407026d0b992d33d312",
      "schema_note": "Single public mode (same as the good endpoint). This forecast URL returns HTTP 400 (latitude out of range), so it must settle UNREACHABLE.",
      "settled_valid": 0,
      "status": "ACTIVE",
      "url": "https://api.open-meteo.com/v1/forecast?latitude=999&longitude=999",
      "violations": 0
    },
    {
      "calls": 1,
      "endpoint_id": 4,
      "price_gen": 2,
      "price_wei": 2000000000000000000,
      "provider": "0xebe057fdd4dbe105dba26706ad079089cb502574",
      "schema_note": "Single public mode: HTTP 200, JSON, current.temperature_2m is a number in -60..60, current.time is a string. Paris current weather, no key.",
      "settled_valid": 1,
      "status": "ACTIVE",
      "url": "https://api.open-meteo.com/v1/forecast?latitude=48.85&longitude=2.35&current=temperature_2m,wind_speed_10m&timezone=Europe%2FParis",
      "violations": 0
    }
  ],
  "counts": {
    "call_count": 7,
    "contract_balance_wei": 0,
    "endpoint_count": 4,
    "escrowed_wei": 0,
    "total_received_wei": 18000000000000000000,
    "total_violations": 1,
    "total_withdrawn_wei": 18000000000000000000
  }
}
```

## Ledger (exact, computed from the live readback above)

- GEN in through the contract's accounting: 18
- GEN withdrawn through the contract's accounting: 18
- Contract balance: 0 GEN, escrowed: 0 GEN, total violations: 1
- E1: settled_valid 3, violations 0.
- E2: settled_valid 0, violations 1.
- E3: settled_valid 0, violations 0.
- E4: settled_valid 1, violations 0.
- Calls: 7, endpoints: 4.
- No value stranded: every failed-payable negative sent 0 GEN by
  design. (Platform behavior, stated honestly in the contract
  docstring: a failed payable call keeps its value in the contract
  on Studionet, so negatives carry no value.) Testnet GEN only,
  zero cash cost.

## Transactions

| Label | Tx | Result |
|-------|----|--------|
| e1-list-good | [0xc9f30df9…](https://explorer-studio.genlayer.com/tx/0xc9f30df9d1732e9429837db991265ac1630f428cee469a9a7be00ce5c5e9d142) | ok |
| e2-list-bad | [0x922cab51…](https://explorer-studio.genlayer.com/tx/0x922cab512662a9705aecd997b9609aadb845ffb0fc4e566dcd3dfccdaaf110d4) | ok |
| e3-list-unreachable | [0x5ba52183…](https://explorer-studio.genlayer.com/tx/0x5ba521833708cb32eed7bb9d9588d1a3cdef937ec6a72856821072a34d770464) | ok |
| c1-call | [0x505399c7…](https://explorer-studio.genlayer.com/tx/0x505399c7e3e250faff2cdd51df4794c9761d9a410f069800bfd680e91e915589) | ok |
| c1-settle | [0xb83fcac8…](https://explorer-studio.genlayer.com/tx/0xb83fcac895b6f12eea036be7e2c9a5b7ddaea0532921e44933ad0318b82ddcfe) | ok · verdict RESPONSE_VALID |
| c2-call | [0x102da22a…](https://explorer-studio.genlayer.com/tx/0x102da22a1aae06b8f5d4f50545d9ce7140d056b16e20fb629bc5cda762707aff) | ok |
| c2-settle | [0xf1ea5aec…](https://explorer-studio.genlayer.com/tx/0xf1ea5aec2b77e56bed765868e4a6dbca41c104df80dc28963ad5d983bd95d0b7) | ok · verdict RESPONSE_VALID |
| c3-call | [0xe7e92552…](https://explorer-studio.genlayer.com/tx/0xe7e9255236d108b150b94b99fb172896ce9619c67f52497f47f159d8d40350f1) | ok |
| c3-settle | [0x5899f788…](https://explorer-studio.genlayer.com/tx/0x5899f788203ee56aab9b122ed7bd4d64589896edc558858a0810798345a2e95c) | ok · verdict RESPONSE_INVALID |
| c4-call | [0xf6f89d2f…](https://explorer-studio.genlayer.com/tx/0xf6f89d2f8671a8e7a0e88c12d47e526808f9308203d36a0198571213f6e89f0e) | ok |
| c4-settle | [0x5a444bfd…](https://explorer-studio.genlayer.com/tx/0x5a444bfdf8b0e9f2e43899ef129648be452e74de8aae15aae2bf7f10304b7a94) | ok · verdict UNREACHABLE |
| c5-call | [0xec49813e…](https://explorer-studio.genlayer.com/tx/0xec49813ec6f3644d3950f7b190785f6f668c4bcdacc89e24ed2eee24a4ab4fd6) | ok |
| neg0-stranger-cancel | [0xdbb6b9e4…](https://explorer-studio.genlayer.com/tx/0xdbb6b9e4005f44e2a243973e88708e0577fae34a2cf9879f7f26842fc351b65b) | error-observed · error ONLY_BUYER_CAN_CANCEL |
| c5-cancel | [0xc12efeef…](https://explorer-studio.genlayer.com/tx/0xc12efeef8a812a4f88f0dabc3d4487d24fdfb42895734809f95f7ded889b1150) | ok |
| neg5-stranger-withdraw | [0xcdaae841…](https://explorer-studio.genlayer.com/tx/0xcdaae8411b1822351e88c29431416525478c73c2ae6ca98e06e9a3a1c7af4d5f) | error-observed · error NO_CREDIT |
| c1-provider-withdraw | [0x10317580…](https://explorer-studio.genlayer.com/tx/0x10317580a1165067995f1e62a9dee08e2adca81fd3f67d6238667ff93ee69dfa) | ok |
| c2-provider-withdraw | [0x1f30d465…](https://explorer-studio.genlayer.com/tx/0x1f30d465508bd4d24960c366839b444508afc47a58b912f1d38584fc379c9cfe) | ok |
| c3-buyer-withdraw | [0x99fec49c…](https://explorer-studio.genlayer.com/tx/0x99fec49cf3a01042989c98728daf6b253e0460a68ec76ad13c501eb638e2d539) | ok |
| c4-buyer-withdraw | [0x58fb1082…](https://explorer-studio.genlayer.com/tx/0x58fb1082e9cf6b04a4474e23164ec96a8bd775c2d60d2de015d7fae723541dfc) | ok |
| c5-buyer-withdraw | [0xeb75b24a…](https://explorer-studio.genlayer.com/tx/0xeb75b24ad7d967589ce9f6b0a03335e1e272e2ce2caa328b6c6ea86043e383c9) | ok |
| c6-call | [0x83ca321e…](https://explorer-studio.genlayer.com/tx/0x83ca321e18e556fcd6337be99352f1f4164409b72b1959ffb03d100081be218b) | ok |
| c6-settle | [0x492bb14f…](https://explorer-studio.genlayer.com/tx/0x492bb14f478bb8f43f6c8575d9f8e84aaf6a1d724421077cc6fafbea2b5568b6) | ok · verdict RESPONSE_VALID |
| c6-provider-withdraw | [0x303d0c66…](https://explorer-studio.genlayer.com/tx/0x303d0c6659a4e66aa3fcadd6ba04613be4fc2470b3866c1b02221b073d075b3a) | ok |
| neg6-double-withdraw | [0xd61bef89…](https://explorer-studio.genlayer.com/tx/0xd61bef89b766e4677882041eaf6f0c05bbe58760b093866575237d9597d1e113) | error-observed · error NO_CREDIT |
| neg1-double-settle | [0xc700597f…](https://explorer-studio.genlayer.com/tx/0xc700597f3e0ede54e0a4e60e1a2887d0065616d3f4f5bb89891e6f4669a6e944) | error-observed · error CALL_NOT_FUNDED |
| neg2-call-unknown-endpoint | [0x8b29be6d…](https://explorer-studio.genlayer.com/tx/0x8b29be6dd61ac31c94b68d662058ada6f7d9d7da509fe6bd095a95e6cd244696) | error-observed · error ENDPOINT_NOT_FOUND |
| neg3-list-price-zero | [0xa11bbcd5…](https://explorer-studio.genlayer.com/tx/0xa11bbcd57cf88b3fd4df6a3a3719c2326e4b054a5bbab5028c0935867e9800dc) | error-observed · error PRICE |
| neg4-list-price-eleven | [0x15e7ff20…](https://explorer-studio.genlayer.com/tx/0x15e7ff202123802daea4da0598c8ea2771d816b9728f48feb72c68bf66719cd2) | error-observed · error PRICE |
| neg7-list-non-openmeteo-url | [0x19eb0715…](https://explorer-studio.genlayer.com/tx/0x19eb07159b4f6615eb7d8c140dc52ae7d37ba8c4e5e93cdc5f44466c4a3f480b) | error-observed · error URL_HOST |
| neg8-call-wrong-value | [0x82610409…](https://explorer-studio.genlayer.com/tx/0x82610409ee52347f18437313f3f3434a061353972e4fc952f77c2a510f4a8429) | error-observed · error VALUE_MUST_EQUAL_PRICE |
| neg9-list-junk-path | [0xfde1a52b…](https://explorer-studio.genlayer.com/tx/0xfde1a52bfc6ca138976bba238ca626c08734e7be5f08715157bc2591e23d7eab) | error-observed · error URL_HOST |

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
| List a junk path after the forecast path (neg9) | URL_HOST, state unchanged | error-observed, see table |
| Bad-mode endpoint (E2, Open-Meteo forecast without a current field) | RESPONSE_INVALID, buyer refunded, violations +1 | settled INVALID, see C3 |
| Unreachable endpoint (E3, Open-Meteo forecast with latitude 999, HTTP 400) | UNREACHABLE, buyer refunded, no violation | settled UNREACHABLE, see C4 |
| Injection text inside a response body | Verdict follows the JSON schema only; instruction text cannot flip it | Mock test in tests/test_callsettle_mock.py (deterministic check, no LLM in the path) |

## Browser write loop C7 (run on the live site 2026-11-12)

Made through the live site in a real browser, with the site's own
in-browser temporary test account (never presented as a wallet
signature). Hashes also live in `docs/browser-transactions.json`;
every hash below was re-read live and confirmed FINALIZED with
leader SUCCESS.

Known limit from this run: the receipt's "Show the API response for
this call" button failed — Open-Meteo's free-tier daily request
limit was exhausted at the time, so the browser could not fetch the
response to display. The settlement itself was verified by validators
(RESPONSE_VALID, required fields present); the display feature is
implemented and works when the API is available.

| Label | Tx | Result |
|-------|----|--------|
| e4-list | [0x91214628…](https://explorer-studio.genlayer.com/tx/0x912146280dc37b10911287978ee42a9e4f53aaa9ea8d1b7f180002c33e5236af) | ok |
| c7-call | [0xcc689942…](https://explorer-studio.genlayer.com/tx/0xcc68994224862590245e29bff854f5ed7abe324f87515cee15f4e952ab9f4549) | ok |
| c7-settle | [0x142461c2…](https://explorer-studio.genlayer.com/tx/0x142461c216015d68ccbd29d2d655ec31364e55a8a623763c76344bec9197b262) | ok · verdict RESPONSE_VALID (0_10) |
| c7-provider-withdraw | [0x9a9d7652…](https://explorer-studio.genlayer.com/tx/0x9a9d7652927767054e82a944357d771531ae0d41f7957967e2490bd3bae7b854) | ok |
