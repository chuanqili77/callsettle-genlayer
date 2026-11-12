// CallSettle: full evidence run on Stable Studionet (61999).
// Pre-registered expectations: EXPECTED.md (written before this run).
// 3 endpoint listings + 6 calls + 5 settlements + 1 cancel +
// 6 withdrawals + 10 on-chain negatives = 31 txs + 1 deploy = 32.
// Resumable via the checkpoint file. Temp accounts live ONLY in the
// checkpoint file (outside the repo, mode 0600).
// Negative checks compare the exact leader-receipt error payload
// (result.payload), never a substring of the whole receipt.
// Settlement retries on MAJORITY_DISAGREE (band flip at a boundary):
// a disagreement leaves the call FUNDED and changes nothing.
// Usage: node scripts/run_evidence.mjs [--checkpoint <path>]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createClient, createAccount} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';

const RPC_URL = 'https://studio.genlayer.com/api';
const CHAIN_ID = 61999;
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const CHECKPOINT = opt('--checkpoint', path.resolve(REPO, '..', '.callsettle-checkpoint.json'));
const TX_PATH = path.join(REPO, 'evidence', 'transactions.json');
const GEN = 1000000000000000000n;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function loadCheckpoint() {
  return JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8'));
}
function saveCheckpoint(cp) {
  fs.writeFileSync(CHECKPOINT, JSON.stringify(cp, null, 2), {mode: 0o600});
  fs.chmodSync(CHECKPOINT, 0o600);
}
function leaderReceipt(tx) {
  let r = tx?.consensus_data?.leader_receipt;
  if (Array.isArray(r)) r = r.find((x) => x.mode === 'leader');
  return r || null;
}
function leaderExec(tx) { return leaderReceipt(tx)?.execution_result; }
function leaderError(tx) { return leaderReceipt(tx)?.result?.payload || ''; }
function good(tx) {
  return [7, 'FINALIZED'].includes(tx.status)
    && [6, 'MAJORITY_AGREE'].includes(tx.result)
    && leaderExec(tx) === 'SUCCESS';
}
function errorObserved(tx, code) {
  return [7, 'FINALIZED'].includes(tx.status)
    && [6, 'MAJORITY_AGREE'].includes(tx.result)
    && leaderExec(tx) === 'ERROR'
    && leaderError(tx) === code;
}
async function collect(client, hash, label) {
  console.log(label, hash);
  for (let i = 0; i < 3; i++) {
    try {
      const tx = await client.waitForTransactionReceipt({hash, status: 'FINALIZED', interval: 5000, retries: 12, fullTransaction: true});
      console.log(label, 'status=', tx.status, 'result=', tx.result, 'leader=', leaderExec(tx), 'leader_error=', leaderError(tx));
      return tx;
    } catch (e) {
      console.log('tracking', label, 'attempt', i, e.shortMessage || e.message);
      await sleep(5000);
    }
  }
  throw new Error('Timeout waiting for FINALIZED: ' + label + ' ' + hash);
}

const cp = loadCheckpoint();
const ADDRESS = cp.contract_address;
if (!ADDRESS) throw new Error('no contract_address in checkpoint; deploy first');
const wallets = cp.wallets;
const accounts = {};
for (const k of Object.keys(wallets)) accounts[k] = createAccount(wallets[k]);
const clients = {};
for (const k of Object.keys(accounts)) clients[k] = createClient({chain: studionet, account: accounts[k]});
const reader = createClient({chain: studionet});
console.log('contract:', ADDRESS);
for (const k of Object.keys(accounts)) console.log(k, ':', accounts[k].address);

const ev = cp.evidence || (cp.evidence = {done: {}, endpoints: {}, calls: {}});
const done = ev.done;
const records = [];
const NEG_ERRORS = {
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
const SETTLE_INFO = {
  'c1-settle': {verdict: 'RESPONSE_VALID', caller: 'OUT'},
  'c2-settle': {verdict: 'RESPONSE_VALID', caller: 'OUT'},
  'c3-settle': {verdict: 'RESPONSE_INVALID', caller: 'OUT'},
  'c4-settle': {verdict: 'UNREACHABLE', caller: 'OUT'},
  'c6-settle': {verdict: 'RESPONSE_VALID', caller: 'OUT'},
};
const LABEL_ORDER = ['e1-list-good', 'e2-list-bad', 'e3-list-unreachable',
  'c1-call', 'c1-settle', 'c2-call', 'c2-settle', 'c3-call', 'c3-settle',
  'c4-call', 'c4-settle', 'c5-call', 'neg0-stranger-cancel', 'c5-cancel',
  'neg5-stranger-withdraw', 'c1-provider-withdraw', 'c2-provider-withdraw',
  'c3-buyer-withdraw', 'c4-buyer-withdraw', 'c5-buyer-withdraw',
  'c6-call', 'c6-settle', 'c6-provider-withdraw',
  'neg6-double-withdraw', 'neg1-double-settle', 'neg2-call-unknown-endpoint',
  'neg3-list-price-zero', 'neg4-list-price-eleven',
  'neg7-list-non-openmeteo-url', 'neg8-call-wrong-value',
  'neg9-list-junk-path'];
for (const label of LABEL_ORDER) {
  const hash = done[label];
  if (!hash) continue;
  if (label.startsWith('neg')) records.push({label, hash, result: 'error-observed', expected_error: NEG_ERRORS[label]});
  else if (/-attempt-\d+$/.test(label)) records.push({label, hash, result: 'disagreed-retry'});
  else if (SETTLE_INFO[label]) records.push({label, hash, result: 'ok', ...SETTLE_INFO[label]});
  else records.push({label, hash, result: 'ok'});
}
for (const label of Object.keys(done).sort()) {
  if (LABEL_ORDER.includes(label)) continue;
  const hash = done[label];
  if (label.startsWith('neg')) records.push({label, hash, result: 'error-observed', expected_error: NEG_ERRORS[label]});
  else if (/-attempt-\d+$/.test(label)) records.push({label, hash, result: 'disagreed-retry'});
  else records.push({label, hash, result: 'ok'});
}
if (records.length > 0) console.log('resumed:', records.length, 'txs already recorded from the checkpoint');
function record(label, hash, result, extra = {}) {
  records.push({label, hash, result, ...extra});
  fs.writeFileSync(TX_PATH, JSON.stringify({network: 'Stable Studionet', chain_id: CHAIN_ID, contract_address: ADDRESS, deploy_tx: cp.deploy_tx, complete: false, transactions: records}, null, 2));
  done[label] = hash;
  saveCheckpoint(cp);
}
async function readCall(id) {
  return JSON.parse(await reader.readContract({address: ADDRESS, functionName: 'get_call', args: [id], transactionHashVariant: 'latest-final'}));
}
async function readEndpoint(id) {
  return JSON.parse(await reader.readContract({address: ADDRESS, functionName: 'get_endpoint', args: [id], transactionHashVariant: 'latest-final'}));
}
async function readCounts() {
  return JSON.parse(await reader.readContract({address: ADDRESS, functionName: 'get_counts', args: [], transactionHashVariant: 'latest-final'}));
}
async function readAllCalls() {
  return reader.readContract({address: ADDRESS, functionName: 'get_all_calls', args: [], transactionHashVariant: 'latest-final'});
}
async function readAllEndpoints() {
  return reader.readContract({address: ADDRESS, functionName: 'get_all_endpoints', args: [], transactionHashVariant: 'latest-final'});
}
function callIdFor(label) {
  const m = label.match(/^c(\d+)-/);
  if (!m) throw new Error('cannot map label to call: ' + label);
  return ev.calls['C' + m[1]];
}
async function resolvePending() {
  if (!cp.pending) return;
  const {label, hash} = cp.pending;
  console.log('resolving pending tx:', label, hash);
  const tx = await reader.waitForTransactionReceipt({hash, status: 'FINALIZED', interval: 5000, retries: 12, fullTransaction: true});
  if (label.startsWith('neg')) {
    const code = NEG_ERRORS[label];
    if (!errorObserved(tx, code)) throw new Error('pending ' + label + ' did not show expected error ' + code);
    record(label, hash, 'error-observed', {expected_error: code, unchanged_state: true});
  } else if (SETTLE_INFO[label]) {
    if ([5, 'MAJORITY_DISAGREE'].includes(tx.result)) {
      const n = Object.keys(done).filter((k) => k.startsWith(label + '-attempt-')).length + 1;
      record(`${label}-attempt-${n}`, hash, 'disagreed-retry');
    } else if (good(tx)) {
      const c = await readCall(callIdFor(label));
      if (c.verdict !== SETTLE_INFO[label].verdict) throw new Error('pending ' + label + ' WRONG VERDICT: expected ' + SETTLE_INFO[label].verdict + ', got ' + c.verdict);
      record(label, hash, 'ok', {verdict: c.verdict, temperature_band: c.temperature_band, snapshot: c.snapshot, caller: SETTLE_INFO[label].caller});
    } else throw new Error('pending ' + label + ' settle tx not good: ' + JSON.stringify(tx).slice(0, 300));
  } else {
    if (!good(tx)) throw new Error('pending ' + label + ' did not reach FINALIZED+AGREE+SUCCESS: ' + JSON.stringify(tx).slice(0, 300));
    record(label, hash, 'ok');
  }
  delete cp.pending; saveCheckpoint(cp);
  console.log('pending resolved:', label, hash);
}
async function writeOk(label, who, fn, args, value = 0n) {
  if (done[label]) { console.log(label, 'already done:', done[label]); return done[label]; }
  await sleep(1000);
  await resolvePending();
  if (done[label]) { console.log(label, 'resolved as done:', done[label]); return done[label]; }
  const hash = await clients[who].writeContract({address: ADDRESS, functionName: fn, args, value, leaderOnly: false});
  cp.pending = {label, hash}; saveCheckpoint(cp);
  const tx = await collect(clients[who], hash, label);
  delete cp.pending; saveCheckpoint(cp);
  if (!good(tx)) throw new Error(label + ' did not reach FINALIZED+AGREE+SUCCESS: ' + JSON.stringify(tx).slice(0, 400));
  record(label, hash, 'ok');
  return hash;
}
async function writeErr(label, who, fn, args, code, value = 0n) {
  if (done[label]) { console.log(label, 'already done:', done[label]); return done[label]; }
  await sleep(1000);
  await resolvePending();
  if (done[label]) { console.log(label, 'resolved as done:', done[label]); return done[label]; }
  const beforeCalls = await readAllCalls();
  const beforeEndpoints = await readAllEndpoints();
  const beforeCounts = await readCounts();
  const hash = await clients[who].writeContract({address: ADDRESS, functionName: fn, args, value, leaderOnly: false});
  cp.pending = {label, hash}; saveCheckpoint(cp);
  const tx = await collect(clients[who], hash, label);
  delete cp.pending; saveCheckpoint(cp);
  if (!errorObserved(tx, code)) throw new Error(label + ' did not show expected error ' + code + ' (leader payload: ' + leaderError(tx) + '): ' + JSON.stringify(tx).slice(0, 400));
  const afterCalls = await readAllCalls();
  const afterEndpoints = await readAllEndpoints();
  const afterCounts = await readCounts();
  const extra = {expected_error: code, unchanged_state: true};
  if (beforeCalls !== afterCalls || beforeEndpoints !== afterEndpoints || JSON.stringify(beforeCounts) !== JSON.stringify(afterCounts)) {
    // v1.3: every failed-payable negative sends 0 GEN, so NO state
    // change of any kind is allowed. (v1.0 had one documented
    // exception: a failed payable kept its value. That exception is
    // gone by design — no negative in this run carries value.)
    throw new Error(label + ' changed state');
  }
  record(label, hash, 'error-observed', extra);
  return hash;
}
async function settleFlow(label, callId, expectedVerdict, caller = 'OUT') {
  if (done[label]) { console.log(label, 'already done:', done[label]); return done[label]; }
  await resolvePending();
  if (done[label]) { console.log(label, 'resolved as done:', done[label]); return done[label]; }
  for (let attempt = 1; attempt <= 3; attempt++) {
    await sleep(1000);
    const hash = await clients[caller].writeContract({address: ADDRESS, functionName: 'settle_call', args: [callId], value: 0n, leaderOnly: false});
    cp.pending = {label, hash}; saveCheckpoint(cp);
    const tx = await collect(clients[caller], hash, `${label} attempt ${attempt} (caller ${caller})`);
    delete cp.pending; saveCheckpoint(cp);
    if ([5, 'MAJORITY_DISAGREE'].includes(tx.result)) {
      console.log(label, 'consensus disagreed (attempt', attempt + '), retrying — call stays FUNDED');
      record(`${label}-attempt-${attempt}`, hash, 'disagreed-retry');
      continue;
    }
    if (!good(tx)) throw new Error(label + ' settle tx not good: ' + JSON.stringify(tx).slice(0, 400));
    const c = await readCall(callId);
    if (c.verdict !== expectedVerdict) {
      throw new Error(label + ' WRONG VERDICT: expected ' + expectedVerdict + ', got ' + c.verdict + ' — aborting, inspect, never paper over');
    }
    checkSnapshot(c, label);
    record(label, hash, 'ok', {verdict: c.verdict, temperature_band: c.temperature_band, snapshot: c.snapshot, attempts: attempt, caller});
    return hash;
  }
  throw new Error(label + ' consensus disagreed 3 times — aborting');
}

function bandOf(temp) {
  if (temp < 0) return 'LT0';
  if (temp < 10) return '0_10';
  if (temp < 20) return '10_20';
  if (temp < 30) return '20_30';
  return 'GT30';
}
function checkSnapshot(c, label) {
  // Settlement-time snapshot: present exactly for RESPONSE_VALID,
  // band derived from its temperature, time a valid ISO string.
  const s = c.snapshot;
  if (c.verdict === 'RESPONSE_VALID') {
    if (!s || typeof s !== 'object') throw new Error(label + ' VALID call has no snapshot');
    if (typeof s.temperature_2m !== 'number' || s.temperature_2m < -60 || s.temperature_2m > 60) throw new Error(label + ' snapshot temperature out of range');
    if (typeof s.time !== 'string' || !s.time || Number.isNaN(Date.parse(s.time))) throw new Error(label + ' snapshot time is not a valid ISO time');
    if (s.wind_speed_10m !== null && s.wind_speed_10m !== undefined && (typeof s.wind_speed_10m !== 'number' || s.wind_speed_10m < 0)) throw new Error(label + ' snapshot wind is not a non-negative number');
    if (bandOf(s.temperature_2m) !== c.temperature_band) throw new Error(label + ' snapshot band does not match its temperature');
  } else if (s !== null && s !== undefined) {
    throw new Error(label + ' non-VALID call must carry snapshot null, got ' + JSON.stringify(s));
  }
}

const GOOD_URL = 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m&timezone=Europe%2FBerlin';
const BAD_URL = 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&timezone=Europe%2FBerlin';
const DEAD_URL = 'https://api.open-meteo.com/v1/forecast?latitude=999&longitude=999';
const NON_OPENMETEO_URL = 'https://httpbin.org/json';
const GOOD_NOTE = 'Single public mode: HTTP 200, JSON, current.temperature_2m is a number in -60..60, current.time is a string. Berlin current weather, no key.';
const BAD_NOTE = 'Single public mode (same as the good endpoint). This forecast URL returns HTTP 200 JSON without a current field, so it must settle RESPONSE_INVALID.';
const DEAD_NOTE = 'Single public mode (same as the good endpoint). This forecast URL returns HTTP 400 (latitude out of range), so it must settle UNREACHABLE.';

async function listEndpoint(key, who, url, price, note) {
  const label = key.toLowerCase() + '-list-' + (key === 'E1' ? 'good' : key === 'E2' ? 'bad' : 'unreachable');
  if (ev.endpoints[key]) { console.log(label, 'already listed as id', ev.endpoints[key]); return ev.endpoints[key]; }
  await writeOk(label, who, 'list_endpoint', [url, price, note]);
  const id = (await readCounts()).endpoint_count;
  ev.endpoints[key] = id;
  saveCheckpoint(cp);
  console.log(key, 'is endpoint id', id);
  return id;
}
async function callApi(key, who, endpointId, priceGen) {
  const label = key.toLowerCase() + '-call';
  if (ev.calls[key]) { console.log(label, 'already created as id', ev.calls[key]); return ev.calls[key]; }
  await writeOk(label, who, 'call_api', [endpointId], BigInt(priceGen) * GEN);
  const id = (await readCounts()).call_count;
  ev.calls[key] = id;
  saveCheckpoint(cp);
  console.log(key, 'is call id', id);
  return id;
}

const ids = {};
ids.E1 = await listEndpoint('E1', 'P1', GOOD_URL, 3, GOOD_NOTE);
ids.E2 = await listEndpoint('E2', 'P1', BAD_URL, 2, BAD_NOTE);
ids.E3 = await listEndpoint('E3', 'P1', DEAD_URL, 2, DEAD_NOTE);

const cids = {};
cids.C1 = await callApi('C1', 'B1', ids.E1, 3);
await settleFlow('c1-settle', cids.C1, 'RESPONSE_VALID');
cids.C2 = await callApi('C2', 'B2', ids.E1, 3);
await settleFlow('c2-settle', cids.C2, 'RESPONSE_VALID');
cids.C3 = await callApi('C3', 'B1', ids.E2, 2);
await settleFlow('c3-settle', cids.C3, 'RESPONSE_INVALID');
cids.C4 = await callApi('C4', 'B2', ids.E3, 2);
await settleFlow('c4-settle', cids.C4, 'UNREACHABLE');
cids.C5 = await callApi('C5', 'B1', ids.E1, 3);

// Negative: a stranger cannot cancel someone else's FUNDED call.
await writeErr('neg0-stranger-cancel', 'OUT', 'cancel_call', [cids.C5], 'ONLY_BUYER_CAN_CANCEL');
// Buyer cancels their own FUNDED call; full refund credit.
await writeOk('c5-cancel', 'B1', 'cancel_call', [cids.C5]);

// Negative: a stranger cannot withdraw someone else's credit.
await writeErr('neg5-stranger-withdraw', 'OUT', 'withdraw', [cids.C1], 'NO_CREDIT');
// Withdrawals: provider collects both VALID payments; buyers collect
// the INVALID refund, the UNREACHABLE refund, and the cancel refund.
await writeOk('c1-provider-withdraw', 'P1', 'withdraw', [cids.C1]);
await writeOk('c2-provider-withdraw', 'P1', 'withdraw', [cids.C2]);
await writeOk('c3-buyer-withdraw', 'B1', 'withdraw', [cids.C3]);
await writeOk('c4-buyer-withdraw', 'B2', 'withdraw', [cids.C4]);
await writeOk('c5-buyer-withdraw', 'B1', 'withdraw', [cids.C5]);

// C6: a second VALID call on E1, settled by OUT, whose provider
// credit is withdrawn INSIDE the scripted run — the provider's key
// stays in the checkpoint file until this withdrawal is FINALIZED,
// so the scripted ledger closes at balance 0 with no credit left
// unwithdrawn.
cids.C6 = await callApi('C6', 'B1', ids.E1, 3);
await settleFlow('c6-settle', cids.C6, 'RESPONSE_VALID');
await writeOk('c6-provider-withdraw', 'P1', 'withdraw', [cids.C6]);

// Remaining negatives. neg2 and neg8 are failed payables sent with
// 0 GEN: the exact error is proved with no value stranded.
await writeErr('neg6-double-withdraw', 'P1', 'withdraw', [cids.C1], 'NO_CREDIT');
await writeErr('neg1-double-settle', 'OUT', 'settle_call', [cids.C1], 'CALL_NOT_FUNDED');
await writeErr('neg2-call-unknown-endpoint', 'B1', 'call_api', [99], 'ENDPOINT_NOT_FOUND', 0n);
await writeErr('neg3-list-price-zero', 'P1', 'list_endpoint', [GOOD_URL, 0, GOOD_NOTE], 'PRICE');
await writeErr('neg4-list-price-eleven', 'P1', 'list_endpoint', [GOOD_URL, 11, GOOD_NOTE], 'PRICE');
await writeErr('neg7-list-non-openmeteo-url', 'P1', 'list_endpoint', [NON_OPENMETEO_URL, 2, GOOD_NOTE], 'URL_HOST');
await writeErr('neg8-call-wrong-value', 'B1', 'call_api', [ids.E1], 'VALUE_MUST_EQUAL_PRICE', 0n);
const JUNK_PATH_URL = 'https://api.open-meteo.com/v1/forecastXYZ?latitude=52.52&longitude=13.41';
await writeErr('neg9-list-junk-path', 'P1', 'list_endpoint', [JUNK_PATH_URL, 2, GOOD_NOTE], 'URL_HOST');

// Final readback vs EXPECTED.md.
const expectCalls = {
  1: {status: 'SETTLED', verdict: 'RESPONSE_VALID', provider_credit: 3000000000000000000, buyer_credit: 0},
  2: {status: 'SETTLED', verdict: 'RESPONSE_VALID', provider_credit: 3000000000000000000, buyer_credit: 0},
  3: {status: 'REFUNDED', verdict: 'RESPONSE_INVALID', provider_credit: 0, buyer_credit: 2000000000000000000},
  4: {status: 'REFUNDED', verdict: 'UNREACHABLE', provider_credit: 0, buyer_credit: 2000000000000000000},
  5: {status: 'CANCELLED', verdict: '', provider_credit: 0, buyer_credit: 3000000000000000000},
  6: {status: 'SETTLED', verdict: 'RESPONSE_VALID', provider_credit: 3000000000000000000, buyer_credit: 0},
};
for (const [key, id] of Object.entries(cids)) {
  const c = await readCall(id);
  const e = expectCalls[id];
  console.log(key, 'id', id, 'status', c.status, 'verdict', c.verdict, 'band', c.temperature_band, 'snapshot', JSON.stringify(c.snapshot), 'provider_credit', c.provider_credit, 'buyer_credit', c.buyer_credit);
  if (c.status !== e.status || c.verdict !== e.verdict || c.provider_credit !== e.provider_credit || c.buyer_credit !== e.buyer_credit) {
    throw new Error(key + ' does not match EXPECTED.md');
  }
  checkSnapshot(c, key);
  if (c.status !== 'CANCELLED' && !c.has_required_fields === (c.verdict === 'RESPONSE_VALID')) {
    // has_required_fields is true exactly for VALID; checked by the line below.
  }
  if ((c.verdict === 'RESPONSE_VALID') !== c.has_required_fields) throw new Error(key + ' has_required_fields inconsistent with verdict');
}
const e2 = await readEndpoint(ids.E2);
const e1 = await readEndpoint(ids.E1);
console.log('E1 settled_valid', e1.settled_valid, 'violations', e1.violations);
console.log('E2 settled_valid', e2.settled_valid, 'violations', e2.violations);
if (e1.settled_valid !== 3 || e1.violations !== 0) throw new Error('E1 counters do not match EXPECTED.md');
if (e2.violations !== 1 || e2.settled_valid !== 0) throw new Error('E2 violations do not match EXPECTED.md');
const counts = await readCounts();
console.log('counts:', JSON.stringify(counts));
// Ledger: 16 GEN received and 16 GEN withdrawn through the contract's
// own accounting (escrowed 0). Contract balance is 0 GEN: no value was
// stranded — every failed-payable negative in v1.3 sent 0 GEN by design
// (see EXPECTED.md, "Honest note on failed payables"), and C6's
// provider credit was withdrawn inside the run.
if (counts.total_received_wei !== 16000000000000000000 || counts.total_withdrawn_wei !== 16000000000000000000 || counts.contract_balance_wei !== 0 || counts.escrowed_wei !== 0 || counts.total_violations !== 1) {
  throw new Error('LEDGER MISMATCH: expected 16 GEN in = 16 out, balance 0, escrow 0, violations 1');
}

fs.mkdirSync(path.dirname(TX_PATH), {recursive: true});
fs.writeFileSync(TX_PATH, JSON.stringify({network: 'Stable Studionet', chain_id: CHAIN_ID, contract_address: ADDRESS, deploy_tx: cp.deploy_tx, complete: true, transactions: records}, null, 2));
console.log('evidence complete:', records.length, 'txs recorded in', TX_PATH);
console.log('ALL EXPECTED OUTCOMES MATCH. 16 GEN in = 16 out, balance 0 (zero stranded value), escrow 0, violations 1.');
