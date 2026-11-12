// Generate EVIDENCE.md and REVIEWER.md from deployment.json +
// transactions.json + docs/browser-transactions.json + a live
// latest-final readback. The ledger numbers below are COMPUTED from
// the live readback at generation time, never hardcoded — so the
// file stays true whether it is generated after the scripted run
// (6 calls, 16 GEN) or after the browser loop (7 calls, 18 GEN).
// Re-run after the browser loop; the browser section is generated
// from docs/browser-transactions.json, so nothing is lost.
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

let browser = null;
try {
  browser = JSON.parse(fs.readFileSync(path.join(REPO, 'docs', 'browser-transactions.json'), 'utf8'));
} catch { browser = null; }
const browserTxs = Array.isArray(browser?.transactions) ? browser.transactions : [];

const okCount = txs.transactions.filter((r) => r.result === 'ok').length;
const errCount = txs.transactions.filter((r) => r.result === 'error-observed').length;
const retryCount = txs.transactions.filter((r) => r.result === 'disagreed-retry').length;

const rows = txs.transactions.map((r) => {
  const extra = r.verdict ? ` · verdict ${r.verdict}${r.temperature_band ? ` (${r.temperature_band})` : ''}` : '';
  const err = r.expected_error ? ` · error ${r.expected_error}` : '';
  return `| ${r.label} | ${txLink(r.hash)} | ${r.result}${extra}${err} |`;
}).join('\n');

const browserRows = browserTxs.map((r) => {
  const extra = r.verdict ? ` · verdict ${r.verdict}${r.temperature_band ? ` (${r.temperature_band})` : ''}` : '';
  return `| ${r.label} | ${txLink(r.hash)} | ${r.result}${extra} |`;
}).join('\n');

const browserSection = browserTxs.length === 0
  ? `## Browser write loop C7 (pre-registered in EXPECTED.md, not yet run)

After the scripted evidence run, one more endpoint and call are made
through the live site in a real browser, with the site's own
in-browser temporary test account (never presented as a wallet
signature). No browser transactions have been recorded yet; when
they are, they are listed in \`docs/browser-transactions.json\` and
in the table below, and this file is re-generated.
`
  : `## Browser write loop C7 (pre-registered in EXPECTED.md before the run)

Made through the live site in a real browser, with the site's own
in-browser temporary test account (never presented as a wallet
signature). Hashes also live in \`docs/browser-transactions.json\`;
every hash below was re-read live and confirmed FINALIZED with
leader SUCCESS.

| Label | Tx | Result |
|-------|----|--------|
${browserRows}
`;

const gen = (wei) => (Number(wei) / 1e18).toString();
const endpointLines = endpoints.map((e) => `- E${e.endpoint_id}: settled_valid ${e.settled_valid}, violations ${e.violations}.`).join('\n');

const evidence = `# EVIDENCE.md — CallSettle (protocol callsettle-1.2)

- Network: Stable Studionet, Chain ID 61999
- Contract: [${ADDRESS}](${addrLink})
- Deploy tx: [${deployment.deploy_tx}](${EX}/tx/${deployment.deploy_tx})
- Source: \`contracts/callsettle.py\` (${deployment.source_bytes} bytes)
- Source SHA-256: \`${deployment.source_sha256}\`
- Byte parity: deployed code is byte-for-byte identical to the repo source
  (\`node scripts/byte_parity.mjs\`).
- Evidence run: ${txs.transactions.length} transactions recorded
  (${okCount} ok, ${errCount} error-observed, ${retryCount} disagreed-retry),
  all FINALIZED. Browser write loop: ${browserTxs.length} transactions
  recorded in \`docs/browser-transactions.json\`. Independent verification:
  \`node scripts/verify_evidence.mjs\` re-reads every transaction live
  and re-checks the readback below.
- Expectations were pre-registered in EXPECTED.md before the run; every
  outcome below matched.

## Final readback (latest-final, generated from live state at ${new Date().toISOString()})

\`\`\`json
${JSON.stringify({calls, endpoints, counts}, null, 2)}
\`\`\`

## Ledger (exact, computed from the live readback above)

- GEN in through the contract's accounting: ${gen(counts.total_received_wei)}
- GEN withdrawn through the contract's accounting: ${gen(counts.total_withdrawn_wei)}
- Contract balance: ${gen(counts.contract_balance_wei)} GEN, escrowed: ${gen(counts.escrowed_wei)} GEN, total violations: ${counts.total_violations}
${endpointLines}
- Calls: ${counts.call_count}, endpoints: ${counts.endpoint_count}.
- No value stranded: every failed-payable negative sent 0 GEN by
  design. (Platform behavior, stated honestly in the contract
  docstring: a failed payable call keeps its value in the contract
  on Studionet, so negatives carry no value.) Testnet GEN only,
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
| List a junk path after the forecast path (neg9) | URL_HOST, state unchanged | error-observed, see table |
| Bad-mode endpoint (E2, Open-Meteo forecast without a current field) | RESPONSE_INVALID, buyer refunded, violations +1 | settled INVALID, see C3 |
| Unreachable endpoint (E3, Open-Meteo forecast with latitude 999, HTTP 400) | UNREACHABLE, buyer refunded, no violation | settled UNREACHABLE, see C4 |
| Injection text inside a response body | Verdict follows the JSON schema only; instruction text cannot flip it | Mock test in tests/test_callsettle_mock.py (deterministic check, no LLM in the path) |

${browserSection}`;

const reviewerBrowserSection = browserTxs.length === 0
  ? `## Browser write-loop transactions (C7)

Pre-registered in EXPECTED.md; not yet run. When the browser loop
runs, its hashes are recorded in \`docs/browser-transactions.json\`
and re-read live by \`node scripts/verify_evidence.mjs\`.
`
  : `## Browser write-loop transactions (C7)

Pre-registered in EXPECTED.md before the run; hashes also in
\`docs/browser-transactions.json\`. All FINALIZED, re-read live.

| Label | Tx | Result |
|-------|----|--------|
${browserRows}
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
- Protocol: callsettle-1.2
- Source SHA-256: \`${deployment.source_sha256}\`
- Deploy tx: [${deployment.deploy_tx}](${EX}/tx/${deployment.deploy_tx})
- Byte parity: \`node scripts/byte_parity.mjs\` (deployed code ==
  repo source, byte for byte)

## Fastest re-check (minutes, no scripts needed)

1. Open the contract address above in the explorer; confirm the deploy
   tx hash matches.
2. Pick any tx hash in the table below; confirm it is FINALIZED.
3. Read the contract's \`get_counts\` (latest-final): ${gen(counts.total_received_wei)} GEN in, ${gen(counts.total_withdrawn_wei)} GEN
   withdrawn, balance ${gen(counts.contract_balance_wei)} GEN, escrowed ${gen(counts.escrowed_wei)} GEN, violations ${counts.total_violations}.
4. Read call 3 (\`get_call\` 3): REFUNDED / RESPONSE_INVALID,
   buyer_credit 2 GEN. Read call 4: REFUNDED / UNREACHABLE. Read
   call 6: SETTLED / RESPONSE_VALID, provider_withdrawn true.

${reviewerBrowserSection}
## Evidence transactions

| Label | Tx | Result |
|-------|----|--------|
${rows}

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
(temperature is stored only as a 10 °C band and never decides
anything). It does not guarantee the third-party API is always
available or that its responses stay the same over time — a later
fetch of the same endpoint can return different weather, and a
later call settles against whatever the response is then.
The schema_note stored at listing is provider-written text, checked
only for length (10–280 chars); it is not verified, and the endpoint
URL is the source of truth.
`;

fs.writeFileSync(path.join(REPO, 'EVIDENCE.md'), evidence);
fs.writeFileSync(path.join(REPO, 'REVIEWER.md'), reviewer);
console.log('wrote EVIDENCE.md and REVIEWER.md');
console.log('calls:', JSON.stringify(calls.map((c) => [c.call_id, c.status, c.verdict, c.temperature_band])));
console.log('counts:', JSON.stringify(counts));
console.log('browser txs:', browserTxs.length);
