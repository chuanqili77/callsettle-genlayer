# EVIDENCE.md — CallSettle (protocol callsettle-1.3)

- Network: Stable Studionet, Chain ID 61999
- Contract: [0xe0c8716f8f1D8C64c8bd3F1eD7d063AFa2bC2A9E](https://explorer-studio.genlayer.com/address/0xe0c8716f8f1D8C64c8bd3F1eD7d063AFa2bC2A9E)
- Deploy tx: [0xd99bcf5080aecb86f83ed295bed71ae2a3df2308ecb68f4d23d655bd9f2b40d9](https://explorer-studio.genlayer.com/tx/0xd99bcf5080aecb86f83ed295bed71ae2a3df2308ecb68f4d23d655bd9f2b40d9)
- Source: `contracts/callsettle.py` (22627 bytes)
- Source SHA-256: `90c67e3e6c48a65cf5c0c665ab80e4bcd8aa5ea8a00cac99fe0dcadbc3c2fe97`
- Byte parity: deployed code is byte-for-byte identical to the repo source
  (`node scripts/byte_parity.mjs`).
- Evidence run: 31 transactions recorded
  (21 ok, 10 error-observed, 0 disagreed-retry),
  all FINALIZED. Browser write loop: 0 transactions
  recorded in `docs/browser-transactions.json`. Independent verification:
  `node scripts/verify_evidence.mjs` re-reads every transaction live
  and re-checks the readback below.
- Expectations were pre-registered in EXPECTED.md before the run; every
  outcome below matched.

## Final readback (latest-final, generated from live state at 2026-11-12T15:13:44.464Z)

```json
{
  "calls": [
    {
      "buyer": "0x9521a2c7a70ea9fe85d218ac6155f7d4978d7b5a",
      "buyer_credit": 0,
      "buyer_withdrawn": false,
      "call_id": 1,
      "endpoint_id": 1,
      "has_required_fields": true,
      "price_gen": 3,
      "price_wei": 3000000000000000000,
      "provider": "0x79a9926a458cf93a1e8002a58f7a1d5d35a68b36",
      "provider_credit": 3000000000000000000,
      "provider_withdrawn": true,
      "snapshot": {
        "temperature_2m": 6.1,
        "time": "2026-11-12T15:45",
        "wind_speed_10m": 9.4
      },
      "status": "SETTLED",
      "temperature_band": "0_10",
      "verdict": "RESPONSE_VALID"
    },
    {
      "buyer": "0x22311d991e74d9f0788c4e9e363cae98b611a5cf",
      "buyer_credit": 0,
      "buyer_withdrawn": false,
      "call_id": 2,
      "endpoint_id": 1,
      "has_required_fields": true,
      "price_gen": 3,
      "price_wei": 3000000000000000000,
      "provider": "0x79a9926a458cf93a1e8002a58f7a1d5d35a68b36",
      "provider_credit": 3000000000000000000,
      "provider_withdrawn": true,
      "snapshot": {
        "temperature_2m": 6.1,
        "time": "2026-11-12T15:45",
        "wind_speed_10m": 9.4
      },
      "status": "SETTLED",
      "temperature_band": "0_10",
      "verdict": "RESPONSE_VALID"
    },
    {
      "buyer": "0x9521a2c7a70ea9fe85d218ac6155f7d4978d7b5a",
      "buyer_credit": 2000000000000000000,
      "buyer_withdrawn": true,
      "call_id": 3,
      "endpoint_id": 2,
      "has_required_fields": false,
      "price_gen": 2,
      "price_wei": 2000000000000000000,
      "provider": "0x79a9926a458cf93a1e8002a58f7a1d5d35a68b36",
      "provider_credit": 0,
      "provider_withdrawn": false,
      "snapshot": null,
      "status": "REFUNDED",
      "temperature_band": "NONE",
      "verdict": "RESPONSE_INVALID"
    },
    {
      "buyer": "0x22311d991e74d9f0788c4e9e363cae98b611a5cf",
      "buyer_credit": 2000000000000000000,
      "buyer_withdrawn": true,
      "call_id": 4,
      "endpoint_id": 3,
      "has_required_fields": false,
      "price_gen": 2,
      "price_wei": 2000000000000000000,
      "provider": "0x79a9926a458cf93a1e8002a58f7a1d5d35a68b36",
      "provider_credit": 0,
      "provider_withdrawn": false,
      "snapshot": null,
      "status": "REFUNDED",
      "temperature_band": "NONE",
      "verdict": "UNREACHABLE"
    },
    {
      "buyer": "0x9521a2c7a70ea9fe85d218ac6155f7d4978d7b5a",
      "buyer_credit": 3000000000000000000,
      "buyer_withdrawn": true,
      "call_id": 5,
      "endpoint_id": 1,
      "has_required_fields": false,
      "price_gen": 3,
      "price_wei": 3000000000000000000,
      "provider": "0x79a9926a458cf93a1e8002a58f7a1d5d35a68b36",
      "provider_credit": 0,
      "provider_withdrawn": false,
      "snapshot": null,
      "status": "CANCELLED",
      "temperature_band": "",
      "verdict": ""
    },
    {
      "buyer": "0x9521a2c7a70ea9fe85d218ac6155f7d4978d7b5a",
      "buyer_credit": 0,
      "buyer_withdrawn": false,
      "call_id": 6,
      "endpoint_id": 1,
      "has_required_fields": true,
      "price_gen": 3,
      "price_wei": 3000000000000000000,
      "provider": "0x79a9926a458cf93a1e8002a58f7a1d5d35a68b36",
      "provider_credit": 3000000000000000000,
      "provider_withdrawn": true,
      "snapshot": {
        "temperature_2m": 6,
        "time": "2026-11-12T16:00",
        "wind_speed_10m": 9.1
      },
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
      "provider": "0x79a9926a458cf93a1e8002a58f7a1d5d35a68b36",
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
      "provider": "0x79a9926a458cf93a1e8002a58f7a1d5d35a68b36",
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
      "provider": "0x79a9926a458cf93a1e8002a58f7a1d5d35a68b36",
      "schema_note": "Single public mode (same as the good endpoint). This forecast URL returns HTTP 400 (latitude out of range), so it must settle UNREACHABLE.",
      "settled_valid": 0,
      "status": "ACTIVE",
      "url": "https://api.open-meteo.com/v1/forecast?latitude=999&longitude=999",
      "violations": 0
    }
  ],
  "counts": {
    "call_count": 6,
    "contract_balance_wei": 0,
    "endpoint_count": 3,
    "escrowed_wei": 0,
    "total_received_wei": 16000000000000000000,
    "total_violations": 1,
    "total_withdrawn_wei": 16000000000000000000
  }
}
```

## Ledger (exact, computed from the live readback above)

- GEN in through the contract's accounting: 16
- GEN withdrawn through the contract's accounting: 16
- Contract balance: 0 GEN, escrowed: 0 GEN, total violations: 1
- E1: settled_valid 3, violations 0.
- E2: settled_valid 0, violations 1.
- E3: settled_valid 0, violations 0.
- Calls: 6, endpoints: 3.
- No value stranded: every failed-payable negative sent 0 GEN by
  design. (Platform behavior, stated honestly in the contract
  docstring: a failed payable call keeps its value in the contract
  on Studionet, so negatives carry no value.) Testnet GEN only,
  zero cash cost.

## Transactions

| Label | Tx | Result |
|-------|----|--------|
| e1-list-good | [0xd4541c3e…](https://explorer-studio.genlayer.com/tx/0xd4541c3e54211f82fb009f0968abf6dcac17e8407d1f475561703d7ee532f2ce) | ok |
| e2-list-bad | [0x80074bb4…](https://explorer-studio.genlayer.com/tx/0x80074bb449a131adc9942e2a777cea902cfe25665c83b1c695b8e2df07c498b1) | ok |
| e3-list-unreachable | [0x1fa5cd14…](https://explorer-studio.genlayer.com/tx/0x1fa5cd14a0d286448b6375a73f5c2bddad79b219de0d51d4ccb58524cd5dde79) | ok |
| c1-call | [0x35166515…](https://explorer-studio.genlayer.com/tx/0x351665150cd7f7185ab87834e63f2c644ccd006c5569bfdf0e84ba97d67f577c) | ok |
| c1-settle | [0xa5594f4e…](https://explorer-studio.genlayer.com/tx/0xa5594f4e11ef9d4bc4483ffa01ceb9da26f55086fa7eaca2aa441cd194cf33af) | ok · verdict RESPONSE_VALID (0_10) |
| c2-call | [0xf3e0f203…](https://explorer-studio.genlayer.com/tx/0xf3e0f203ac29ce8075edb599e16bafe2a57cfe5b04b88a8a59685f9fe1cfcc74) | ok |
| c2-settle | [0xe1135ea8…](https://explorer-studio.genlayer.com/tx/0xe1135ea8ae5861883a3f23f26218659670c8af196a6fce342cb08e3dc86ae829) | ok · verdict RESPONSE_VALID (0_10) |
| c3-call | [0x74cf942d…](https://explorer-studio.genlayer.com/tx/0x74cf942d09dad14fdb021a2de345a78579160ae0f88e6dee4d5ca737b742b02a) | ok |
| c3-settle | [0xabd5f66b…](https://explorer-studio.genlayer.com/tx/0xabd5f66ba61bc876a65ae43232bcd69bc92e2e076f49c9611c478b2bd47caa35) | ok · verdict RESPONSE_INVALID (NONE) |
| c4-call | [0xac9ab81d…](https://explorer-studio.genlayer.com/tx/0xac9ab81d3543c32ddc595c49f36dc8eaabd4f3414a118f7c1792198804009c85) | ok |
| c4-settle | [0x74d87ad5…](https://explorer-studio.genlayer.com/tx/0x74d87ad5edc1caa838ebba765df24c661d97235f1367357ef5ea6548fd595683) | ok · verdict UNREACHABLE (NONE) |
| c5-call | [0xfde18b97…](https://explorer-studio.genlayer.com/tx/0xfde18b97d7ccc14cb50ffad204c589b1e35e1dec6d970d60a64c5efacdf3976c) | ok |
| neg0-stranger-cancel | [0x945c1fb0…](https://explorer-studio.genlayer.com/tx/0x945c1fb03a0a70d3aae9e7fe3883c40fe48937b4ff2c2ed8fef4163d2313e81b) | error-observed · error ONLY_BUYER_CAN_CANCEL |
| c5-cancel | [0x86e0454e…](https://explorer-studio.genlayer.com/tx/0x86e0454e6d7fc53f546b5564c0bd144a2dac7b9d5aa3c32413faf593bad299ee) | ok |
| neg5-stranger-withdraw | [0x9f3e8ef5…](https://explorer-studio.genlayer.com/tx/0x9f3e8ef55ff553361d5c7280110f26172856b42498b569f1efe7d2863710125e) | error-observed · error NO_CREDIT |
| c1-provider-withdraw | [0xdc04e6ac…](https://explorer-studio.genlayer.com/tx/0xdc04e6ac0fd0033bd377950146a3527b575ec58db6c5c9a8c3615c5038b3e316) | ok |
| c2-provider-withdraw | [0x8cde97a4…](https://explorer-studio.genlayer.com/tx/0x8cde97a4a8d7f86ed0d31850dceb4aabfa487ed1a05780a8f05b79c2e544c760) | ok |
| c3-buyer-withdraw | [0x33284566…](https://explorer-studio.genlayer.com/tx/0x33284566d1c7400a5eff38d012c4bbdecd79afdaf5341d14e4d7fd554ad9278f) | ok |
| c4-buyer-withdraw | [0x946247fa…](https://explorer-studio.genlayer.com/tx/0x946247fa727c0b3ecbc1e02c0810d3c53dbe4d74128d733c5759897f109bf9a1) | ok |
| c5-buyer-withdraw | [0xa1120516…](https://explorer-studio.genlayer.com/tx/0xa1120516256f40668dce7c5a0f5bc9d0799e7ec98a5d8ba6e4373b9361b414b0) | ok |
| c6-call | [0xf4792d05…](https://explorer-studio.genlayer.com/tx/0xf4792d05635ae36d22ed2af64b32aa03f9bf29d234d659f8c211d06678e3a22b) | ok |
| c6-settle | [0x06e252a3…](https://explorer-studio.genlayer.com/tx/0x06e252a338eb2f9a423cf8fa8da91a625f8f3a6d2a06e96b0be8eacd404c678e) | ok · verdict RESPONSE_VALID (0_10) |
| c6-provider-withdraw | [0x21aa9d82…](https://explorer-studio.genlayer.com/tx/0x21aa9d826c61aeb830b7b65c37b5818c57edaf81ac6a7b6419d171e535cc3792) | ok |
| neg6-double-withdraw | [0x934fe4a0…](https://explorer-studio.genlayer.com/tx/0x934fe4a0cd7cc1021911981d5d9572e5a01c73465584a2b3f19e9d12d8975480) | error-observed · error NO_CREDIT |
| neg1-double-settle | [0xe5681448…](https://explorer-studio.genlayer.com/tx/0xe56814485961ca97dca95d36171e9386090d01c193390212b18e69c7159263d3) | error-observed · error CALL_NOT_FUNDED |
| neg2-call-unknown-endpoint | [0x63d3bd07…](https://explorer-studio.genlayer.com/tx/0x63d3bd07f1f33978cf8f4840c01c9aa63e12b26573116db03e1ef75149af373c) | error-observed · error ENDPOINT_NOT_FOUND |
| neg3-list-price-zero | [0xaf6798ca…](https://explorer-studio.genlayer.com/tx/0xaf6798caf5c98132c6f6964817edd3629fab17abee1d94387ce4b2897a6d0325) | error-observed · error PRICE |
| neg4-list-price-eleven | [0x8db91500…](https://explorer-studio.genlayer.com/tx/0x8db91500f6b4f6b5fc261caa714ea9de5d971ea5d68c05a12bb1f95363708f01) | error-observed · error PRICE |
| neg7-list-non-openmeteo-url | [0x170a1b79…](https://explorer-studio.genlayer.com/tx/0x170a1b796d63f567a83595c43ac4e2976f1c1c2d0c6d629a65e3d462321edaf5) | error-observed · error URL_HOST |
| neg8-call-wrong-value | [0x7424e68e…](https://explorer-studio.genlayer.com/tx/0x7424e68e19000ed09cde0c53bf27369feafe1b48e9a8bceaee8fb1674bc2082a) | error-observed · error VALUE_MUST_EQUAL_PRICE |
| neg9-list-junk-path | [0x8c584e2f…](https://explorer-studio.genlayer.com/tx/0x8c584e2f5b742b645ced34dad5ff9f556838d720e29836d8c9cd14593728b529) | error-observed · error URL_HOST |

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

## Browser write loop C8 (pre-registered in EXPECTED.md, not yet run)

After the scripted evidence run, one more endpoint and call are made
through the live site in a real browser, with the site's own
in-browser temporary test account (never presented as a wallet
signature). No browser transactions have been recorded yet; when
they are, they are listed in `docs/browser-transactions.json` and
in the table below, and this file is re-generated. The loop is
called C8 (on-chain call_id 7 on this contract); the label
continues the browser-loop sequence from v1.2, whose browser call
was C7. Its settlement writes a settlement-time snapshot into the
call record, and the receipt shows that snapshot read from the
chain.
