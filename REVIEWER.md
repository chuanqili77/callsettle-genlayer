# REVIEWER.md — CallSettle

## Claim

Every API call settles against its live response: validators
independently fetch the provider's public endpoint and judge it
against the single public mode (Open-Meteo weather response:
HTTP 200, JSON, current.temperature_2m a number in -60..60,
current.time a string), and the money follows the verdict (VALID pays
the provider, INVALID refunds the buyer and records a violation,
UNREACHABLE refunds the buyer without a violation).

## Anchor

The provider's public endpoint response itself — outside the
beneficiary's control, fetched independently by each validator at
settlement. Demo endpoints: Open-Meteo public weather API (valid),
an Open-Meteo forecast URL without a `current` field (invalid),
an Open-Meteo forecast URL with latitude 999, which returns HTTP 400
(unreachable).

## Contract

- Address: [0x58c71cDA976912e9F16438317dE7804523EFaEe6](https://explorer-studio.genlayer.com/address/0x58c71cDA976912e9F16438317dE7804523EFaEe6)
- Protocol: callsettle-1.1
- Source SHA-256: `abc7fe77b13a64f705b27817b5ea9df8cc1bcd86e4c81acb5e23b3bd274f4908`
- Deploy tx: [0xeb68bda674c14e2e555cd92d372220d72b43448bcef404a17fd110da1cecf4a1](https://explorer-studio.genlayer.com/tx/0xeb68bda674c14e2e555cd92d372220d72b43448bcef404a17fd110da1cecf4a1)
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

## Adversarial cases

See EVIDENCE.md — 9 on-chain negatives (stranger cancel, double
settle, unknown endpoint at 0 GEN, price 0/11, stranger withdraw,
double withdraw, non-Open-Meteo URL, wrong-value call) plus the
bad-mode and unreachable settlements. All FINALIZED with the exact
expected error payloads; state unchanged after each negative.

## What this project does not prove

It does not prove an endpoint is business-correct (only that its
response matches the single public mode); it does not prove keyed
endpoints work; it does not prove temperature readings are accurate
(temperature is stored only as a 10 °C band and never decides
anything).
