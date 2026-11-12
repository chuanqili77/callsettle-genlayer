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

- Address: [0xe0c8716f8f1D8C64c8bd3F1eD7d063AFa2bC2A9E](https://explorer-studio.genlayer.com/address/0xe0c8716f8f1D8C64c8bd3F1eD7d063AFa2bC2A9E)
- Protocol: callsettle-1.3
- Source SHA-256: `90c67e3e6c48a65cf5c0c665ab80e4bcd8aa5ea8a00cac99fe0dcadbc3c2fe97`
- Deploy tx: [0xd99bcf5080aecb86f83ed295bed71ae2a3df2308ecb68f4d23d655bd9f2b40d9](https://explorer-studio.genlayer.com/tx/0xd99bcf5080aecb86f83ed295bed71ae2a3df2308ecb68f4d23d655bd9f2b40d9)
- Byte parity: `node scripts/byte_parity.mjs` (deployed code ==
  repo source, byte for byte)

## Fastest re-check (minutes, no scripts needed)

1. Open the contract address above in the explorer; confirm the deploy
   tx hash matches.
2. Pick any tx hash in the table below; confirm it is FINALIZED.
3. Read the contract's `get_counts` (latest-final): 18 GEN in, 18 GEN
   withdrawn, balance 0 GEN, escrowed 0 GEN, violations 1.
4. Read call 3 (`get_call` 3): REFUNDED / RESPONSE_INVALID,
   buyer_credit 2 GEN. Read call 4: REFUNDED / UNREACHABLE. Read
   call 6: SETTLED / RESPONSE_VALID, provider_withdrawn true, with
   a settlement-time snapshot (temperature_2m, time,
   wind_speed_10m) whose band matches its temperature.

## Browser write-loop transactions (C8)

Pre-registered in EXPECTED.md before the run; hashes also in
`docs/browser-transactions.json`. All FINALIZED, re-read live.
The loop is called C8 (on-chain call_id 7 on this contract); its
settlement wrote a settlement-time snapshot into the call record,
shown in the receipt read from the chain.

| Label | Tx | Result |
|-------|----|--------|
| e4-list | [0x35524e98…](https://explorer-studio.genlayer.com/tx/0x35524e981cd000c2feaec8669402f998265e359edcde9d2224be692fde54f920) | ok |
| c7-call | [0xfa98bc90…](https://explorer-studio.genlayer.com/tx/0xfa98bc90936c661ed2637b5a446906bfba21d0d7a00a3a912556998b0cd8b469) | ok |
| c7-settle | [0x2eefeffc…](https://explorer-studio.genlayer.com/tx/0x2eefeffc14b4e4341706a129adb9a914f7748dff4b777b04f7668cbd7722f51e) | ok · verdict RESPONSE_VALID (10_20) |
| c7-provider-withdraw | [0xb5848089…](https://explorer-studio.genlayer.com/tx/0xb5848089abc875234e55729aa288f7fc3183a48cb44604b73bf5d6c34fe52d0f) | ok |

## Evidence transactions

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

## Adversarial cases

See EVIDENCE.md — 10 on-chain negatives (stranger cancel, double
settle, unknown endpoint at 0 GEN, price 0/11, stranger withdraw,
double withdraw, non-Open-Meteo URL, wrong-value call, junk path
after the forecast path) plus the bad-mode and unreachable
settlements. All FINALIZED with the exact expected error payloads;
state unchanged after each negative.

## What this project does not prove

It does not prove an endpoint is business-correct (only that its
response matches the single public mode); it does not prove keyed
endpoints work; it does not prove temperature readings are accurate
(temperature decides nothing: the verdict uses only the response
shape, and the exact temperature is kept only as a settlement-time
snapshot for display). It does not guarantee the third-party API is
always available or that its responses stay the same over time — a later
fetch of the same endpoint can return different weather, and a
later call settles against whatever the response is then. The
snapshot is the record of what a settlement was based on; the
receipt shows the snapshot read from the chain and never fetches
the endpoint again.
The schema_note stored at listing is provider-written text, checked
only for length (10–280 chars); it is not verified, and the endpoint
URL is the source of truth.
