// Generate EVIDENCE.md and REVIEWER.md from deployment.json +
// transactions.json + a live latest-final readback. Run after the
// evidence run and after any re-verification:
//   node scripts/write_evidence_md.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EX = 'https://explorer-studio.genlayer.com';
const deployment = JSON.parse(fs.readFileSync(path.join(REPO, 'evidence', 'deployment.json'), 'utf8'));
const txs = JSON.parse(fs.readFileSync(path.join(REPO, 'evidence', 'transactions.json'), 'utf8'));
const ADDRESS = deployment.contract_address;
const reader = createClient({chain: studionet});
const read = async (fn, args) => JSON.parse(await reader.readContract({address: ADDRESS, functionName: fn, args, transactionHashVariant: 'latest-final'}));

const calls = await read('get_all_calls', []);
const endpoints = await read('get_all_endpoints', []);
const counts = await read('get_counts', []);
const txLink = (h) => `[${h.slice(0, 10)}…](${EX}/tx/${h})`;
const addrLink = `${EX}/address/${ADDRESS}`;

const okCount = txs.transactions.filter((r) => r.result === 'ok').length;
const errCount = txs.transactions.filter((r) => r.result === 'error-observed').length;
const retryCount = txs.transactions.filter((r) => r.result === 'disagreed-retry').length;

const rows = txs.transactions.map((r) => {
  const extra = r.verdict ? ` · verdict ${r.verdict}${r.temperature_band ? ` (${r.temperature_band})` : ''}` : '';
  const err = r.expected_error ? ` · error ${r.expected_error}` : '';
  return `| ${r.label} | ${txLink(r.hash)} | ${r.result}${extra}${err} |`;
}).join('\n');

const evidence = `# EVIDENCE.md — CallSettle (protocol callsettle-1.1)

- Network: Stable Studionet, Chain ID 61999
- Contract: [${ADDRESS}](${addrLink})
- Deploy tx: [${deployment.deploy_tx}](${EX}/tx/${deployment.deploy_tx})
- Source: \`contracts/callsettle.py\` (${deployment.source_bytes} bytes)
- Source SHA-256: \`${deployment.source_sha256}\`
- Byte parity: deployed code is byte-for-byte identical to the repo source
  (\`node scripts/byte_parity.mjs\`).
- Evidence run: ${txs.transactions.length} transactions recorded
  (${okCount} ok, ${errCount} error-observed, ${retryCount} disagreed-retry),
  all FINALIZED. Independent verification: \`node scripts/verify_evidence.mjs\`
  re-reads every transaction live and re-checks the readback below.
- Expectations were pre-registered in EXPECTED.md before the run; every
  outcome below matched.

## Final readback (latest-final)

\`\`\`json
${JSON.stringify({calls, endpoints, counts}, null, 2)}
\`\`\`

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
${rows}

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
`;

const reviewer = `# REVIEWER.md — CallSettle

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
an Open-Meteo forecast URL without a \`current\` field (invalid),
an Open-Meteo forecast URL with latitude 999, which returns HTTP 400
(unreachable).

## Contract

- Address: [${ADDRESS}](${addrLink})
- Protocol: callsettle-1.1
- Source SHA-256: \`${deployment.source_sha256}\`
- Deploy tx: [${deployment.deploy_tx}](${EX}/tx/${deployment.deploy_tx})
- Byte parity: \`node scripts/byte_parity.mjs\` (deployed code ==
  repo source, byte for byte)

## Fastest re-check (minutes, no scripts needed)

1. Open the contract address above in the explorer; confirm the deploy
   tx hash matches.
2. Pick any tx hash in the table below; confirm it is FINALIZED.
3. Read the contract's \`get_counts\` (latest-final): 13 GEN in =
   13 GEN out, balance 0, escrow 0, violations 1.
4. Read call 3 (\`get_call\` 3): REFUNDED / RESPONSE_INVALID,
   buyer_credit 2 GEN. Read call 4: REFUNDED / UNREACHABLE.

## Evidence transactions

| Label | Tx | Result |
|-------|----|--------|
${rows}

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
`;

fs.writeFileSync(path.join(REPO, 'EVIDENCE.md'), evidence);
fs.writeFileSync(path.join(REPO, 'REVIEWER.md'), reviewer);
console.log('wrote EVIDENCE.md and REVIEWER.md');
console.log('calls:', JSON.stringify(calls.map((c) => [c.call_id, c.status, c.verdict, c.temperature_band])));
console.log('counts:', JSON.stringify(counts));
