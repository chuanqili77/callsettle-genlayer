# EVIDENCE.md — CallSettle (protocol callsettle-1)

- Network: Stable Studionet, Chain ID 61999
- Contract: [0x445Fcd2bBCEbF42C7EE3946644ADdb64698E66E2](https://explorer-studio.genlayer.com/address/0x445Fcd2bBCEbF42C7EE3946644ADdb64698E66E2)
- Deploy tx: [0x78b128620a88b2e4e65a7bcf43057b72f8b66f7d656f1af7a1fda969956ad24c](https://explorer-studio.genlayer.com/tx/0x78b128620a88b2e4e65a7bcf43057b72f8b66f7d656f1af7a1fda969956ad24c)
- Source: `contracts/callsettle.py` (15989 bytes)
- Source SHA-256: `31d4db85b85680d08d8a697642fd5579d633f88c911c940c25e940a5f2fd551b`
- Byte parity: deployed code is byte-for-byte identical to the repo source
  (`node scripts/byte_parity.mjs`).
- Evidence run: 25 transactions recorded
  (18 ok, 7 error-observed, 0 disagreed-retry),
  all FINALIZED. Independent verification: `node scripts/verify_evidence.mjs`
  re-reads every transaction live and re-checks the readback below.
- Expectations were pre-registered in EXPECTED.md before the run; every
  outcome below matched.

## Final readback (latest-final)

```json
{
  "calls": [
    {
      "buyer": "0x19f5bbc57654916d5b24ff6886a6a46317ac93a1",
      "buyer_credit": 0,
      "buyer_withdrawn": false,
      "call_id": 1,
      "endpoint_id": 1,
      "has_required_fields": true,
      "price_gen": 3,
      "price_wei": 3000000000000000000,
      "provider": "0x509d30c3dcecb3e7e6be3848c49385df8a5c84a6",
      "provider_credit": 3000000000000000000,
      "provider_withdrawn": true,
      "status": "SETTLED",
      "temperature_band": "0_10",
      "verdict": "RESPONSE_VALID"
    },
    {
      "buyer": "0x7c5b0813924efa46fcdd41922574d31ba7924a7e",
      "buyer_credit": 0,
      "buyer_withdrawn": false,
      "call_id": 2,
      "endpoint_id": 1,
      "has_required_fields": true,
      "price_gen": 3,
      "price_wei": 3000000000000000000,
      "provider": "0x509d30c3dcecb3e7e6be3848c49385df8a5c84a6",
      "provider_credit": 3000000000000000000,
      "provider_withdrawn": true,
      "status": "SETTLED",
      "temperature_band": "0_10",
      "verdict": "RESPONSE_VALID"
    },
    {
      "buyer": "0x19f5bbc57654916d5b24ff6886a6a46317ac93a1",
      "buyer_credit": 2000000000000000000,
      "buyer_withdrawn": true,
      "call_id": 3,
      "endpoint_id": 2,
      "has_required_fields": false,
      "price_gen": 2,
      "price_wei": 2000000000000000000,
      "provider": "0x509d30c3dcecb3e7e6be3848c49385df8a5c84a6",
      "provider_credit": 0,
      "provider_withdrawn": false,
      "status": "REFUNDED",
      "temperature_band": "NONE",
      "verdict": "RESPONSE_INVALID"
    },
    {
      "buyer": "0x7c5b0813924efa46fcdd41922574d31ba7924a7e",
      "buyer_credit": 2000000000000000000,
      "buyer_withdrawn": true,
      "call_id": 4,
      "endpoint_id": 3,
      "has_required_fields": false,
      "price_gen": 2,
      "price_wei": 2000000000000000000,
      "provider": "0x509d30c3dcecb3e7e6be3848c49385df8a5c84a6",
      "provider_credit": 0,
      "provider_withdrawn": false,
      "status": "REFUNDED",
      "temperature_band": "NONE",
      "verdict": "UNREACHABLE"
    },
    {
      "buyer": "0x19f5bbc57654916d5b24ff6886a6a46317ac93a1",
      "buyer_credit": 3000000000000000000,
      "buyer_withdrawn": true,
      "call_id": 5,
      "endpoint_id": 1,
      "has_required_fields": false,
      "price_gen": 3,
      "price_wei": 3000000000000000000,
      "provider": "0x509d30c3dcecb3e7e6be3848c49385df8a5c84a6",
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
      "provider": "0x509d30c3dcecb3e7e6be3848c49385df8a5c84a6",
      "schema_note": "HTTP 200, JSON, current.temperature_2m is a number in -60..60, current.time is a string. Berlin current weather, no key.",
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
      "provider": "0x509d30c3dcecb3e7e6be3848c49385df8a5c84a6",
      "schema_note": "Same agreed schema as the good endpoint. This endpoint returns HTTP 200 JSON without a current field, so it must settle RESPONSE_INVALID.",
      "settled_valid": 0,
      "status": "ACTIVE",
      "url": "https://httpbin.org/json",
      "violations": 1
    },
    {
      "calls": 1,
      "endpoint_id": 3,
      "price_gen": 2,
      "price_wei": 2000000000000000000,
      "provider": "0x509d30c3dcecb3e7e6be3848c49385df8a5c84a6",
      "schema_note": "Same agreed schema as the good endpoint. This host does not exist, so it must settle UNREACHABLE.",
      "settled_valid": 0,
      "status": "ACTIVE",
      "url": "https://nonexistent-callsettle-xyz.invalid/",
      "violations": 0
    }
  ],
  "counts": {
    "call_count": 5,
    "contract_balance_wei": 3000000000000000000,
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
- Contract balance: 3 GEN — stranded by the FAILED payable neg2 (call
  to a nonexistent endpoint, 3 GEN sent). Platform behavior: a failed
  payable call keeps its value in the contract. The 3 GEN has
  no withdraw path and is disclosed here, not hidden. Testnet GEN only,
  zero cash cost.

## Transactions

| Label | Tx | Result |
|-------|----|--------|
| e1-list-good | [0x7b8788df…](https://explorer-studio.genlayer.com/tx/0x7b8788dfb724ad65dc638f2659f62a7253d681d2d1c90dac5efa4e051ad4413e) | ok |
| e2-list-bad | [0xa05aa207…](https://explorer-studio.genlayer.com/tx/0xa05aa2070d2982585e0ff1065768c7b8bffd98aab825b8e97cdc9915bb44ba2d) | ok |
| e3-list-unreachable | [0x4fa7c6da…](https://explorer-studio.genlayer.com/tx/0x4fa7c6daf095f44c73d31c40366ae5699407fdd54c9404b21728728fde1916e2) | ok |
| c1-call | [0x88acde9a…](https://explorer-studio.genlayer.com/tx/0x88acde9a0dcbea66fa066093e4cb90b2e813ee574942c21deed1d9a1b455e15d) | ok |
| c1-settle | [0xa49646c8…](https://explorer-studio.genlayer.com/tx/0xa49646c820e493441c901c1ecd73c70f99eb4e61639efd6798a1dae7fd548e35) | ok · verdict RESPONSE_VALID |
| c2-call | [0x6136ebcc…](https://explorer-studio.genlayer.com/tx/0x6136ebccba68b1b3a9e6acaaa675c760522af0bf3564574d4ea1c558f9cef06a) | ok |
| c2-settle | [0x8ee0b768…](https://explorer-studio.genlayer.com/tx/0x8ee0b768acb155aa1228b093992d53cc347a4ca12f45a72450c85b5af9a0e00a) | ok · verdict RESPONSE_VALID |
| c3-call | [0xf4c8373b…](https://explorer-studio.genlayer.com/tx/0xf4c8373b9d8d6d684045cf4c9654c80430528060d9549453a1bd1dc7480992ec) | ok |
| c3-settle | [0x45ada98e…](https://explorer-studio.genlayer.com/tx/0x45ada98ed4df8a41c4ddfce5cca6d0b23455e1d2671c57722ff0c11a97315fbd) | ok · verdict RESPONSE_INVALID |
| c4-call | [0x36559ba4…](https://explorer-studio.genlayer.com/tx/0x36559ba4a7680bf1332b7450cb2113281093a45f3fb7bf457eeaf887317723b5) | ok |
| c4-settle | [0xcbfeb134…](https://explorer-studio.genlayer.com/tx/0xcbfeb134264a833774af9fdd1d3e5836254944ab09b6ddf80844cd2a0caf8cbf) | ok · verdict UNREACHABLE |
| c5-call | [0xf30a9ab0…](https://explorer-studio.genlayer.com/tx/0xf30a9ab0606477a3ae78e15d07ac47ec856d15766577a430cb1d6765a1e2e655) | ok |
| neg0-stranger-cancel | [0x48e25753…](https://explorer-studio.genlayer.com/tx/0x48e25753198833db7f9df44c85abd4840f96f6bdce62ace8054ed50ceb033e16) | error-observed · error ONLY_BUYER_CAN_CANCEL |
| c5-cancel | [0x8445c533…](https://explorer-studio.genlayer.com/tx/0x8445c533892aaa5cceaa4c86e2c95b51576c4528f50bc1c1352d088ceef16048) | ok |
| neg5-stranger-withdraw | [0x72790406…](https://explorer-studio.genlayer.com/tx/0x72790406abdccfa4599e694166c99cc4f71bf096a0560c8a2c55f62d3f7b37f2) | error-observed · error NO_CREDIT |
| c1-provider-withdraw | [0x9414c1f8…](https://explorer-studio.genlayer.com/tx/0x9414c1f8f9965f77ef4c9de9360373f1ec364cb79cb5b76726d26b2ff7f4c783) | ok |
| c2-provider-withdraw | [0x229f2bd2…](https://explorer-studio.genlayer.com/tx/0x229f2bd294fb40e4e65ecbe5373ab2f06a63f7596036ce391f0478589ba15c1d) | ok |
| c3-buyer-withdraw | [0x2935f4bb…](https://explorer-studio.genlayer.com/tx/0x2935f4bbaa4d31e2a01cc04c2106bff3a88b4af61c539c7bef7140ece032d827) | ok |
| c4-buyer-withdraw | [0xde76d17f…](https://explorer-studio.genlayer.com/tx/0xde76d17fcae1d376bdd732f24b8474c77ef1fa2383de3a5d7b767b60e96547cf) | ok |
| c5-buyer-withdraw | [0xf84296d8…](https://explorer-studio.genlayer.com/tx/0xf84296d8bc42b2804f6a7a31702e47559b31bcedbc1c24821579218c294eb141) | ok |
| neg6-double-withdraw | [0x1a635e35…](https://explorer-studio.genlayer.com/tx/0x1a635e35e07c1bd525b2e87915d499e463802d71e44989945556f17892d637ec) | error-observed · error NO_CREDIT |
| neg1-double-settle | [0x1821cc6e…](https://explorer-studio.genlayer.com/tx/0x1821cc6ecfb7a1a145eaaf27ad0bc5d2f98827d991d4567c217588fb9248d1ad) | error-observed · error CALL_NOT_FUNDED |
| neg2-call-unknown-endpoint | [0x7ad5cd2b…](https://explorer-studio.genlayer.com/tx/0x7ad5cd2b0ad73a9207cdbc57245fab06ebc6a75b8042b2664295c2a234f85a60) | error-observed · error ENDPOINT_NOT_FOUND |
| neg3-list-price-zero | [0x7d0fc987…](https://explorer-studio.genlayer.com/tx/0x7d0fc987d31e09f95c2dc1266a24883674cd20521f08b33878615e778ebb1493) | error-observed · error PRICE |
| neg4-list-price-eleven | [0x5cf56857…](https://explorer-studio.genlayer.com/tx/0x5cf56857d5d32b0bbf8348e73796cbd1739351d2da6e51c709a2e63a0b3b3302) | error-observed · error PRICE |

## Adversarial cases (all on-chain)

| Case | Expected | Actual |
|------|----------|--------|
| Stranger cancels another buyer's FUNDED call (neg0) | ONLY_BUYER_CAN_CANCEL, state unchanged | error-observed, see table |
| Double-settle an already SETTLED call (neg1) | CALL_NOT_FUNDED, state unchanged | error-observed, see table |
| Call a nonexistent endpoint (neg2) | ENDPOINT_NOT_FOUND | error-observed, see table |
| List an endpoint at price 0 / 11 GEN (neg3/neg4) | PRICE | error-observed, see table |
| Stranger withdraws another party's credit (neg5) | NO_CREDIT, state unchanged | error-observed, see table |
| Double-withdraw an already withdrawn credit (neg6) | NO_CREDIT, state unchanged | error-observed, see table |
| Bad-schema endpoint (E2, httpbin.org/json) | RESPONSE_INVALID, buyer refunded, violations +1 | settled INVALID, see C3 |
| Unreachable endpoint (E3, unresolvable host) | UNREACHABLE, buyer refunded, no violation | settled UNREACHABLE, see C4 |
| Injection text inside a response body | Verdict follows the JSON schema only; instruction text cannot flip it | Mock test in tests/test_callsettle_mock.py (deterministic check, no LLM in the path) |
