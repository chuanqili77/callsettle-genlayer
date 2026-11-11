# REVIEWER.md — CallSettle

## Claim

Every API call settles against its live response: validators
independently fetch the provider's public endpoint and judge it
against the schema agreed on-chain at listing, and the money follows
the verdict (VALID pays the provider, INVALID refunds the buyer and
records a violation, UNREACHABLE refunds the buyer without a
violation).

## Anchor

The provider's public endpoint response itself — outside the
beneficiary's control, fetched independently by each validator at
settlement. Demo endpoints: Open-Meteo public weather API (valid),
`https://httpbin.org/json` (HTTP 200, no `current` field — invalid),
an unresolvable host (unreachable).

## Contract

- Address: [0x445Fcd2bBCEbF42C7EE3946644ADdb64698E66E2](https://explorer-studio.genlayer.com/address/0x445Fcd2bBCEbF42C7EE3946644ADdb64698E66E2)
- Protocol: callsettle-1
- Source SHA-256: `31d4db85b85680d08d8a697642fd5579d633f88c911c940c25e940a5f2fd551b`
- Deploy tx: [0x78b128620a88b2e4e65a7bcf43057b72f8b66f7d656f1af7a1fda969956ad24c](https://explorer-studio.genlayer.com/tx/0x78b128620a88b2e4e65a7bcf43057b72f8b66f7d656f1af7a1fda969956ad24c)
- Byte parity: `node scripts/byte_parity.mjs` (deployed code ==
  repo source, byte for byte)

## Fastest re-check (minutes, no scripts needed)

1. Open the contract address above in the explorer; confirm the deploy
   tx hash matches.
2. Pick any tx hash in the table below; confirm it is FINALIZED.
3. Read the contract's `get_counts` (latest-final): 13 GEN in =
   13 GEN out, balance 0, escrow 0, violations 1.
4. Read call 3 (`get_call` 3): REFUNDED / RESPONSE_INVALID,
   buyer_credit 2 GEN. Read call 4: REFUNDED / UNREACHABLE.

## Evidence transactions

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

## Adversarial cases

See EVIDENCE.md — 7 on-chain negatives (stranger cancel, double
settle, unknown endpoint, price 0/11, stranger withdraw, double
withdraw) plus the bad-schema and unreachable settlements. All
FINALIZED with the exact expected error payloads; state unchanged
after each negative.

## What this project does not prove

It does not prove an endpoint is business-correct (only that its
response matches the agreed schema); it does not prove keyed endpoints
work; it does not prove temperature readings are accurate (temperature
is stored only as a 10 °C band and never decides anything).
