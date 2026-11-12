// CallSettle: independent verification. Re-reads EVERY transaction in
// evidence/transactions.json live from Studionet and re-checks the
// final readback against EXPECTED.md. Exact comparisons only: no
// substring matching, and a MAJORITY_DISAGREE is never counted as PASS.
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
const byLabel = {};
for (const rec of txs.transactions) byLabel[rec.label] = rec;
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
};
const EXPECTED_VERDICT = {
  'c1-settle': 'RESPONSE_VALID',
  'c2-settle': 'RESPONSE_VALID',
  'c3-settle': 'RESPONSE_INVALID',
  'c4-settle': 'UNREACHABLE',
};
for (const rec of txs.transactions) {
  await sleep(200);
  let tx;
  try {
    tx = await reader.waitForTransactionReceipt({hash: rec.hash, status: 'FINALIZED', interval: 5000, retries: 6, fullTransaction: true});
  } catch (e) {
    ok(`tx ${rec.label} re-read FINALIZED`, false, String(e?.message || e));
    continue;
  }
  const finalized = [7, 'FINALIZED'].includes(tx.status);
  const agreed = [6, 'MAJORITY_AGREE'].includes(tx.result);
  const leader = leaderReceipt(tx);
  if (rec.result === 'ok') {
    ok(`tx ${rec.label} FINALIZED+AGREE+SUCCESS`, finalized && agreed && leader?.execution_result === 'SUCCESS',
      `status=${tx.status} result=${tx.result} leader=${leader?.execution_result}`);
    if (EXPECTED_VERDICT[rec.label]) {
      ok(`tx ${rec.label} verdict recorded as ${EXPECTED_VERDICT[rec.label]}`, rec.verdict === EXPECTED_VERDICT[rec.label], `recorded verdict=${rec.verdict}`);
    }
  } else if (rec.result === 'error-observed') {
    const payload = leader?.result?.payload || '';
    ok(`tx ${rec.label} FINALIZED+AGREE+ERROR with exact payload ${EXPECTED_ERROR[rec.label]}`,
      finalized && agreed && leader?.execution_result === 'ERROR' && payload === EXPECTED_ERROR[rec.label],
      `status=${tx.status} result=${tx.result} leader=${leader?.execution_result} payload=${payload}`);
  } else if (rec.result === 'disagreed-retry') {
    ok(`tx ${rec.label} is a recorded MAJORITY_DISAGREE retry (fail-closed, not a pass)`,
      [5, 'MAJORITY_DISAGREE'].includes(tx.result));
  } else {
    ok(`tx ${rec.label} has a known result kind`, false, rec.result);
  }
}

// 3. Final readback vs EXPECTED.md (latest-final reads).
const read = async (fn, args) => JSON.parse(await reader.readContract({address: ADDRESS, functionName: fn, args, transactionHashVariant: 'latest-final'}));
const expectCalls = {
  1: {status: 'SETTLED', verdict: 'RESPONSE_VALID', provider_credit: 3000000000000000000, buyer_credit: 0, has_required_fields: true},
  2: {status: 'SETTLED', verdict: 'RESPONSE_VALID', provider_credit: 3000000000000000000, buyer_credit: 0, has_required_fields: true},
  3: {status: 'REFUNDED', verdict: 'RESPONSE_INVALID', provider_credit: 0, buyer_credit: 2000000000000000000, has_required_fields: false},
  4: {status: 'REFUNDED', verdict: 'UNREACHABLE', provider_credit: 0, buyer_credit: 2000000000000000000, has_required_fields: false},
  5: {status: 'CANCELLED', verdict: '', provider_credit: 0, buyer_credit: 3000000000000000000, has_required_fields: false},
  // Browser write loops (pre-registered in EXPECTED.md before each run,
  // hashes in public/browser-transactions.json, re-read here as well).
  6: {status: 'SETTLED', verdict: 'RESPONSE_VALID', provider_credit: 3000000000000000000, buyer_credit: 0, has_required_fields: true},
  7: {status: 'SETTLED', verdict: 'RESPONSE_VALID', provider_credit: 2000000000000000000, buyer_credit: 0, has_required_fields: true},
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
const e4 = await read('get_endpoint', [4]);
ok('E1 readback: 3 settled_valid, 0 violations', e1.settled_valid === 3 && e1.violations === 0, JSON.stringify(e1));
ok('E2 readback: 0 settled_valid, 1 violation', e2.settled_valid === 0 && e2.violations === 1, JSON.stringify(e2));
ok('E3 readback: 0 settled_valid, 0 violations', e3.settled_valid === 0 && e3.violations === 0, JSON.stringify(e3));
ok('E4 readback: 1 settled_valid, 0 violations', e4.settled_valid === 1 && e4.violations === 0, JSON.stringify(e4));
const c6 = await read('get_call', [6]);
const c7 = await read('get_call', [7]);
ok('call 6 provider credit unwithdrawn (P1 key deleted after evidence run, disclosed)', c6.provider_withdrawn === false && c6.provider_credit === 3000000000000000000, JSON.stringify(c6));
ok('call 7 provider credit withdrawn in browser', c7.provider_withdrawn === true && c7.provider_credit === 2000000000000000000, JSON.stringify(c7));
const counts = await read('get_counts', []);
ok('counts: 4 endpoints, 7 calls, 1 violation',
  counts.endpoint_count === 4 && counts.call_count === 7 && counts.total_violations === 1, JSON.stringify(counts));
ok('ledger: 18 GEN in, 15 GEN withdrawn, balance 3 GEN (= C6 provider credit to P1, key deleted, disclosed — not stranded value); escrowed 3 GEN, violations 1',
  counts.total_received_wei === 18000000000000000000 && counts.total_withdrawn_wei === 15000000000000000000
  && counts.contract_balance_wei === 3000000000000000000 && counts.escrowed_wei === 3000000000000000000, JSON.stringify(counts));
ok('protocol is callsettle-1.1', (await reader.readContract({address: ADDRESS, functionName: 'get_protocol', args: [], transactionHashVariant: 'latest-final'})) === 'callsettle-1.1');

console.log(`\nverify: ${pass} PASS, ${fail} FAIL, ${txs.transactions.length} txs checked`);
if (fail > 0) { console.log('failures:', failures.join(', ')); process.exit(1); }
console.log('INDEPENDENT VERIFICATION PASS');
