// CallSettle: independent verification. Re-reads EVERY transaction in
// evidence/transactions.json AND (when the browser loop has run)
// docs/browser-transactions.json live from Studionet, and re-checks
// the final readback against EXPECTED.md. Exact comparisons only: no
// substring matching, and a MAJORITY_DISAGREE is never counted as PASS.
// The scripted checks (calls 1-6, endpoints 1-3, 16 GEN in = 16 out,
// balance 0) must pass WITHOUT the browser loop; the browser section
// runs only when docs/browser-transactions.json actually lists txs,
// and then also checks the final 18 GEN in = 18 out, balance 0.
// Usage: node scripts/verify_evidence.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';

const RPC_URL = 'https://studio.genlayer.com/api';
const CHAIN_ID = 61999;
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reader = createClient({chain: studionet});
const deployment = JSON.parse(fs.readFileSync(path.join(REPO, 'evidence', 'deployment.json'), 'utf8'));
const txs = JSON.parse(fs.readFileSync(path.join(REPO, 'evidence', 'transactions.json'), 'utf8'));
const ADDRESS = deployment.contract_address;
const sha = (s) => createHash('sha256').update(s).digest('hex');

let pass = 0;
let fail = 0;
const failures = [];
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; failures.push(name); console.log('FAIL', name, extra); }
}
function leaderReceipt(tx) {
  let r = tx?.consensus_data?.leader_receipt;
  if (Array.isArray(r)) r = r.find((x) => x.mode === 'leader');
  return r || null;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. Byte parity: deployed code == repo source, byte for byte.
const source = fs.readFileSync(path.join(REPO, 'contracts', 'callsettle.py'), 'utf8');
const onChain = await reader.getContractCode(ADDRESS);
ok('byte parity (deployed code == repo source)', onChain === source);
ok('source sha matches deployment.json', sha(source) === deployment.source_sha256);
ok('deploy tx recorded', typeof txs.deploy_tx === 'string' && txs.deploy_tx.startsWith('0x'));

// 2. Every recorded transaction, re-read live.
const EXPECTED_ERROR = {
  'neg0-stranger-cancel': 'ONLY_BUYER_CAN_CANCEL',
  'neg1-double-settle': 'CALL_NOT_FUNDED',
  'neg2-call-unknown-endpoint': 'ENDPOINT_NOT_FOUND',
  'neg3-list-price-zero': 'PRICE',
  'neg4-list-price-eleven': 'PRICE',
  'neg5-stranger-withdraw': 'NO_CREDIT',
  'neg6-double-withdraw': 'NO_CREDIT',
  'neg7-list-non-openmeteo-url': 'URL_HOST',
  'neg8-call-wrong-value': 'VALUE_MUST_EQUAL_PRICE',
  'neg9-list-junk-path': 'URL_HOST',
};
const EXPECTED_VERDICT = {
  'c1-settle': 'RESPONSE_VALID',
  'c2-settle': 'RESPONSE_VALID',
  'c3-settle': 'RESPONSE_INVALID',
  'c4-settle': 'UNREACHABLE',
  'c6-settle': 'RESPONSE_VALID',
};
async function checkTxRecord(rec, where) {
  await sleep(200);
  let tx;
  try {
    tx = await reader.waitForTransactionReceipt({hash: rec.hash, status: 'FINALIZED', interval: 5000, retries: 6, fullTransaction: true});
  } catch (e) {
    ok(`tx ${where}:${rec.label} re-read FINALIZED`, false, String(e?.message || e));
    return null;
  }
  const finalized = [7, 'FINALIZED'].includes(tx.status);
  const agreed = [6, 'MAJORITY_AGREE'].includes(tx.result);
  const leader = leaderReceipt(tx);
  if (rec.result === 'ok') {
    ok(`tx ${where}:${rec.label} FINALIZED+AGREE+SUCCESS`, finalized && agreed && leader?.execution_result === 'SUCCESS',
      `status=${tx.status} result=${tx.result} leader=${leader?.execution_result}`);
    if (EXPECTED_VERDICT[rec.label]) {
      ok(`tx ${where}:${rec.label} verdict recorded as ${EXPECTED_VERDICT[rec.label]}`, rec.verdict === EXPECTED_VERDICT[rec.label], `recorded verdict=${rec.verdict}`);
    }
  } else if (rec.result === 'error-observed') {
    const payload = leader?.result?.payload || '';
    ok(`tx ${where}:${rec.label} FINALIZED+AGREE+ERROR with exact payload ${EXPECTED_ERROR[rec.label]}`,
      finalized && agreed && leader?.execution_result === 'ERROR' && payload === EXPECTED_ERROR[rec.label],
      `status=${tx.status} result=${tx.result} leader=${leader?.execution_result} payload=${payload}`);
  } else if (rec.result === 'disagreed-retry') {
    ok(`tx ${where}:${rec.label} is a recorded MAJORITY_DISAGREE retry (fail-closed, not a pass)`,
      [5, 'MAJORITY_DISAGREE'].includes(tx.result));
  } else {
    ok(`tx ${where}:${rec.label} has a known result kind`, false, rec.result);
  }
  return tx;
}
for (const rec of txs.transactions) await checkTxRecord(rec, 'evidence');

// The browser file is loaded here (before section 3) because the two
// aggregate checks below only hold on the scripted run alone: once the
// browser loop has run, live counts/ledger reflect it, and section 4
// is the authority for those numbers.
let browser = null;
try {
  browser = JSON.parse(fs.readFileSync(path.join(REPO, 'docs', 'browser-transactions.json'), 'utf8'));
} catch { browser = null; }
const browserTxs = Array.isArray(browser?.transactions) ? browser.transactions : [];

// 3. Scripted final readback vs EXPECTED.md (latest-final reads).
// These must pass on the scripted run alone, before any browser loop.
const read = async (fn, args) => JSON.parse(await reader.readContract({address: ADDRESS, functionName: fn, args, transactionHashVariant: 'latest-final'}));
const expectCalls = {
  1: {status: 'SETTLED', verdict: 'RESPONSE_VALID', provider_credit: 3000000000000000000, buyer_credit: 0, has_required_fields: true},
  2: {status: 'SETTLED', verdict: 'RESPONSE_VALID', provider_credit: 3000000000000000000, buyer_credit: 0, has_required_fields: true},
  3: {status: 'REFUNDED', verdict: 'RESPONSE_INVALID', provider_credit: 0, buyer_credit: 2000000000000000000, has_required_fields: false},
  4: {status: 'REFUNDED', verdict: 'UNREACHABLE', provider_credit: 0, buyer_credit: 2000000000000000000, has_required_fields: false},
  5: {status: 'CANCELLED', verdict: '', provider_credit: 0, buyer_credit: 3000000000000000000, has_required_fields: false},
  6: {status: 'SETTLED', verdict: 'RESPONSE_VALID', provider_credit: 3000000000000000000, buyer_credit: 0, has_required_fields: true},
};
for (const [id, e] of Object.entries(expectCalls)) {
  const c = await read('get_call', [Number(id)]);
  ok(`call ${id} readback == EXPECTED.md`,
    c.status === e.status && c.verdict === e.verdict && c.provider_credit === e.provider_credit
    && c.buyer_credit === e.buyer_credit && c.has_required_fields === e.has_required_fields,
    JSON.stringify(c));
  ok(`call ${id} temperature_band is a band string, never a float`,
    typeof c.temperature_band === 'string' && ['LT0', '0_10', '10_20', '20_30', 'GT30', 'NONE', ''].includes(c.temperature_band),
    c.temperature_band);
}
const e1 = await read('get_endpoint', [1]);
const e2 = await read('get_endpoint', [2]);
const e3 = await read('get_endpoint', [3]);
ok('E1 readback: 3 settled_valid, 0 violations', e1.settled_valid === 3 && e1.violations === 0, JSON.stringify(e1));
ok('E2 readback: 0 settled_valid, 1 violation', e2.settled_valid === 0 && e2.violations === 1, JSON.stringify(e2));
ok('E3 readback: 0 settled_valid, 0 violations', e3.settled_valid === 0 && e3.violations === 0, JSON.stringify(e3));
const c6 = await read('get_call', [6]);
ok('call 6 provider credit withdrawn inside the scripted run', c6.provider_withdrawn === true && c6.provider_credit === 3000000000000000000, JSON.stringify(c6));
const counts = await read('get_counts', []);
if (browserTxs.length === 0) {
  ok('counts: 3 endpoints, 6 calls, 1 violation',
    counts.endpoint_count === 3 && counts.call_count === 6 && counts.total_violations === 1, JSON.stringify(counts));
  ok('ledger (scripted): 16 GEN in, 16 GEN withdrawn, balance 0, escrowed 0, violations 1',
    counts.total_received_wei === 16000000000000000000 && counts.total_withdrawn_wei === 16000000000000000000
    && counts.contract_balance_wei === 0 && counts.escrowed_wei === 0, JSON.stringify(counts));
} else {
  console.log('counts/ledger (scripted): superseded by the post-browser checks in section 4');
}
ok('protocol is callsettle-1.2', (await reader.readContract({address: ADDRESS, functionName: 'get_protocol', args: [], transactionHashVariant: 'latest-final'})) === 'callsettle-1.2');

// 4. Browser write loop (only when it has actually run; the file was
// loaded before section 3).
if (browserTxs.length === 0) {
  console.log('\nbrowser write loop: not yet run (pre-registered in EXPECTED.md) — scripted checks above are the complete result for now');
} else {
  console.log(`\nbrowser write loop: ${browserTxs.length} txs recorded, verifying live`);
  ok('browser file names the same contract', browser.contract_address === ADDRESS, String(browser.contract_address));
  const byLabel = {};
  for (const rec of browserTxs) byLabel[rec.label] = rec;
  for (const rec of browserTxs) await checkTxRecord(rec, 'browser');
  // Each browser settle must match the call's on-chain verdict; each
  // browser withdraw must match the call's withdrawn flag.
  for (const rec of browserTxs) {
    const m = rec.label.match(/^c(\d+)-(settle|provider-withdraw|buyer-withdraw)$/);
    if (!m) continue;
    const call = await read('get_call', [Number(m[1])]);
    if (m[2] === 'settle' && rec.verdict) {
      ok(`browser ${rec.label}: on-chain verdict == recorded ${rec.verdict}`,
        call.verdict === rec.verdict, JSON.stringify(call));
    }
    if (m[2] === 'provider-withdraw') {
      ok(`browser ${rec.label}: provider credit withdrawn on-chain`, call.provider_withdrawn === true, JSON.stringify(call));
    }
    if (m[2] === 'buyer-withdraw') {
      ok(`browser ${rec.label}: buyer credit withdrawn on-chain`, call.buyer_withdrawn === true, JSON.stringify(call));
    }
  }
  if (byLabel['e4-list']) {
    const e4 = await read('get_endpoint', [4]);
    ok('E4 readback: Paris endpoint, ACTIVE, price 2 GEN',
      e4.status === 'ACTIVE' && e4.price_gen === 2
      && e4.url === 'https://api.open-meteo.com/v1/forecast?latitude=48.85&longitude=2.35&current=temperature_2m,wind_speed_10m&timezone=Europe%2FParis',
      JSON.stringify(e4));
  }
  if (byLabel['c7-settle']) {
    const c7 = await read('get_call', [7]);
    ok('call 7 readback == EXPECTED.md (browser loop)',
      c7.status === 'SETTLED' && c7.verdict === 'RESPONSE_VALID'
      && c7.provider_credit === 2000000000000000000 && c7.buyer_credit === 0 && c7.has_required_fields === true,
      JSON.stringify(c7));
  }
  if (byLabel['c7-provider-withdraw']) {
    const counts2 = await read('get_counts', []);
    ok('counts after browser loop: 4 endpoints, 7 calls, 1 violation',
      counts2.endpoint_count === 4 && counts2.call_count === 7 && counts2.total_violations === 1, JSON.stringify(counts2));
    ok('ledger after browser loop: 18 GEN in, 18 GEN withdrawn, balance 0, escrowed 0',
      counts2.total_received_wei === 18000000000000000000 && counts2.total_withdrawn_wei === 18000000000000000000
      && counts2.contract_balance_wei === 0 && counts2.escrowed_wei === 0, JSON.stringify(counts2));
  }
}

console.log(`\nverify: ${pass} PASS, ${fail} FAIL, ${txs.transactions.length} scripted txs + ${browserTxs.length} browser txs checked`);
if (fail > 0) { console.log('failures:', failures.join(', ')); process.exit(1); }
console.log('INDEPENDENT VERIFICATION PASS');
