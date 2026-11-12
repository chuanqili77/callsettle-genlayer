// CallSettle chain layer — GenLayer Stable Studionet only (Chain ID 61999).
// Reads are pinned to latest-final. Writes go through an injected EVM
// wallet (OKX first) or a labelled in-browser ephemeral test account.
// A payable write (call_api) with a temporary account requires the
// key-backup acknowledgement first: the key must be saved before any
// escrowed funds can depend on it (see App.tsx). No private keys are
// ever written to disk or sent anywhere; the temp key lives in this
// tab's sessionStorage only.
import { createClient, createAccount, generatePrivateKey } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

export const CHAIN_ID = 61999;
export const CHAIN_ID_HEX = '0xf22f';
export const RPC_URL = 'https://studio.genlayer.com/api';
export const EXPLORER_BASE = 'https://explorer-studio.genlayer.com';
export const GEN_WEI = 1000000000000000000n;
export const MIN_PRICE_GEN = 1;
export const MAX_PRICE_GEN = 10;

export interface Deployment { contract_address: string; deploy_tx: string; source_sha256: string; network: string; chain_id: number }
export let DEPLOYMENT: Deployment | null = null;
export async function loadDeployment(): Promise<Deployment> {
  const res = await fetch('./deployment.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('deployment.json not served (' + res.status + ')');
  DEPLOYMENT = (await res.json()) as Deployment;
  if (!/^0x[0-9a-fA-F]{40}$/.test(DEPLOYMENT.contract_address || '')) {
    throw new Error('deployment.json has no valid contract_address');
  }
  return DEPLOYMENT;
}
export const contractAddress = () => DEPLOYMENT!.contract_address;
export const explorerTx = (h: string) => EXPLORER_BASE + '/tx/' + h;
export const explorerAddress = (a: string) => EXPLORER_BASE + '/address/' + a;

export const reader = createClient({ chain: studionet });

export interface EndpointRec {
  endpoint_id: number; provider: string; url: string; price_gen: number;
  price_wei: number; schema_note: string; status: string; calls: number;
  settled_valid: number; violations: number;
}
export interface CallRec {
  call_id: number; endpoint_id: number; buyer: string; provider: string;
  price_gen: number; price_wei: number; status: string; verdict: string;
  temperature_band: string; has_required_fields: boolean;
  buyer_credit: number; provider_credit: number;
  buyer_withdrawn: boolean; provider_withdrawn: boolean;
}
export interface Counts {
  endpoint_count: number; call_count: number; total_violations: number;
  total_received_wei: number; total_withdrawn_wei: number;
  contract_balance_wei: number; escrowed_wei: number;
}

// The finalized flag is derived inside these functions from a real
// latest-final read returning data — never assigned by a caller.
// `at` is the wall-clock time THIS latest-final readback completed, in
// ISO form. It is NOT an on-chain finalization timestamp (Studionet
// exposes no block timestamp to the UI); the UI labels it as a readback
// time, never as "finalized at" a chain time.
//
// Retry note: a single read is three sequential RPC calls. A transient
// network failure surfaces from viem as "An unknown RPC error
// occurred. Details: Failed to fetch" — the trailing "Version:
// viem@x.y.z" is viem's error footer, NOT a version probe (the only
// web3_clientVersion call in genlayer-js lives in the unused
// MetaMask-snap helper, which this app never calls). Retrying the
// whole read absorbs the blip instead of leaving a stale error line
// next to an otherwise good FINALIZED readback.
//
// Timeout note (2026-11-12, after a real-browser first load stalled
// 7+ minutes on "waiting for FINALIZED readback"): a hung RPC fetch
// throws nothing, so the retry loop above never ran. Every read is
// therefore raced against a 30s timeout, so a hung read fails fast
// and the retry loop actually runs. A late response from a timed-out
// attempt is ignored.
const withTimeout = <T,>(p: Promise<T>, ms: number, what: string): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('READ_TIMEOUT: ' + what)), ms))]);
export async function readAll(): Promise<{ endpoints: EndpointRec[]; calls: CallRec[]; counts: Counts; is_finalized_readback: boolean; at: string }> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const rawE = await withTimeout(reader.readContract({ address: contractAddress() as `0x${string}`, functionName: 'get_all_endpoints', args: [], transactionHashVariant: 'latest-final' as any }), 30000, 'get_all_endpoints');
      const rawC = await withTimeout(reader.readContract({ address: contractAddress() as `0x${string}`, functionName: 'get_all_calls', args: [], transactionHashVariant: 'latest-final' as any }), 30000, 'get_all_calls');
      const rawN = await withTimeout(reader.readContract({ address: contractAddress() as `0x${string}`, functionName: 'get_counts', args: [], transactionHashVariant: 'latest-final' as any }), 30000, 'get_counts');
      const endpoints = JSON.parse(rawE as unknown as string) as EndpointRec[];
      const calls = JSON.parse(rawC as unknown as string) as CallRec[];
      const counts = JSON.parse(rawN as unknown as string) as Counts;
      const ok = typeof rawE === 'string' && Array.isArray(endpoints) && Array.isArray(calls) && typeof counts === 'object';
      return { endpoints, calls, counts, is_finalized_readback: ok, at: new Date().toISOString() };
    } catch (e) {
      lastErr = e;
      if (attempt < 2) await sleep(1000 * (attempt + 1));
    }
  }
  throw lastErr;
}

// ---- Tx lifecycle: hash saved immediately, timeout is "unknown" ----
export interface PendingTx { hash: string; label: string; savedAt: string }
const PENDING_KEY = 'callsettle-pending-txs';
export function savePendingTx(hash: string, label: string) {
  try {
    const list: PendingTx[] = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    if (!list.some((p) => p.hash === hash)) list.push({ hash, label, savedAt: new Date().toISOString() });
    localStorage.setItem(PENDING_KEY, JSON.stringify(list));
  } catch { /* storage unavailable: hash is still shown on screen */ }
}
export function loadPendingTxs(): PendingTx[] {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch { return []; }
}
export function clearPendingTx(hash: string) {
  try {
    const list: PendingTx[] = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    localStorage.setItem(PENDING_KEY, JSON.stringify(list.filter((p) => p.hash !== hash)));
  } catch { /* ignore */ }
}

// ---- My transaction history: append-only, this browser tab only ----
// Pending txs are cleared once FINALIZED, so they cannot back the
// receipt detail afterwards. Every hash this tab sends is also kept
// here (keyed by hash, label updatable once the new call id is known
// from the post-tx readback) so a receipt can always link its real
// transactions. Nothing here leaves the browser.
export interface MyTx { hash: string; label: string; savedAt: string; result: string }
const MY_TXS_KEY = 'callsettle-my-txs';
export function saveMyTx(hash: string, label: string) {
  try {
    const list: MyTx[] = JSON.parse(localStorage.getItem(MY_TXS_KEY) || '[]');
    const at = new Date().toISOString();
    const i = list.findIndex((p) => p.hash === hash);
    if (i >= 0) list[i] = { hash, label, savedAt: list[i].savedAt || at, result: list[i].result || 'ok' };
    else list.push({ hash, label, savedAt: at, result: 'ok' });
    localStorage.setItem(MY_TXS_KEY, JSON.stringify(list.slice(-200)));
  } catch { /* storage unavailable: hash is still shown on screen */ }
}
export function loadMyTxs(): MyTx[] {
  try {
    return (JSON.parse(localStorage.getItem(MY_TXS_KEY) || '[]') as MyTx[])
      .map((m) => ({ ...m, result: m.result || 'ok' }));
  } catch { return []; }
}

export class TxUnknownError extends Error {
  hash: string;
  constructor(hash: string) {
    super('TX_UNKNOWN: sent but not yet FINALIZED — outcome unknown, still polling');
    this.hash = hash;
  }
}

export async function waitFinalized(hash: string) {
  try {
    return await reader.waitForTransactionReceipt({ hash: hash as any, status: 'FINALIZED' as any, interval: 3000, retries: 40, fullTransaction: true } as any);
  } catch {
    throw new TxUnknownError(hash);
  }
}
export function leaderReceipt(tx: any) {
  let r = tx?.consensus_data?.leader_receipt;
  if (Array.isArray(r)) r = r.find((x: any) => x.mode === 'leader');
  return r || null;
}
export function leaderExecution(tx: any) { return leaderReceipt(tx)?.execution_result || null; }
export function leaderPayload(tx: any) {
  const r = leaderReceipt(tx);
  if (!r) return '';
  if (r.result?.payload) return String(r.result.payload);
  if (typeof r.result?.raw === 'string') {
    try { return atob(r.result.raw); } catch { return ''; }
  }
  return '';
}
export function txGood(tx: any) {
  return [7, 'FINALIZED'].includes(tx.status) && [6, 'MAJORITY_AGREE'].includes(tx.result) && leaderExecution(tx) === 'SUCCESS';
}

export function injectedProvider(): any {
  if ((window as any).okxwallet?.ethereum?.request) return (window as any).okxwallet.ethereum;
  if ((window as any).okxwallet?.request) return (window as any).okxwallet;
  if ((window as any).ethereum?.request) return (window as any).ethereum;
  return null;
}
export function walletKind(): string {
  if ((window as any).okxwallet?.ethereum) return 'OKX Wallet';
  if ((window as any).ethereum?.isMetaMask) return 'MetaMask';
  if ((window as any).ethereum) return 'Injected wallet';
  return 'No injected wallet detected';
}

async function switchToStudionet(provider: any) {
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_ID_HEX }] });
  } catch (e: any) {
    if (e?.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{ chainId: CHAIN_ID_HEX, chainName: 'GenLayer Studionet', nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 }, rpcUrls: [RPC_URL], blockExplorerUrls: [EXPLORER_BASE] }],
      });
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_ID_HEX }] });
    } else { throw e; }
  }
  const chainId = await provider.request({ method: 'eth_chainId' });
  if (Number(chainId) !== CHAIN_ID) throw new Error('WRONG_CHAIN_AFTER_SWITCH: ' + String(chainId));
}

export interface Wallet { mode: 'injected' | 'temporary'; address: string; client: any; signer_mode: string; provider?: any }
export async function connectInjected(): Promise<Wallet> {
  const provider = injectedProvider();
  if (!provider) throw new Error('NO_INJECTED_WALLET');
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  await switchToStudionet(provider);
  const address = String(accounts[0]).toLowerCase();
  const client = createClient({ chain: studionet, provider, account: address as `0x${string}` });
  return { mode: 'injected', address, provider, client, signer_mode: 'INJECTED_WALLET' };
}
export async function ensureInjectedChain(wallet: Wallet) {
  if (wallet.mode !== 'injected' || !wallet.provider) return;
  const chainId = await wallet.provider.request({ method: 'eth_chainId' });
  if (Number(chainId) !== CHAIN_ID) {
    await switchToStudionet(wallet.provider);
  }
}

const TEMP_KEY = 'callsettle-temp-private-key';
const TEMP_ACK = 'callsettle-temp-key-acked';
export function tempPrivateKey(): string | null {
  try { return sessionStorage.getItem(TEMP_KEY); } catch { return null; }
}
export function isTempKeyAcked(): boolean {
  try { return sessionStorage.getItem(TEMP_ACK) === 'yes'; } catch { return false; }
}
export function ackTempKey() {
  try { sessionStorage.setItem(TEMP_ACK, 'yes'); } catch { /* ignore */ }
}
export async function temporaryAccount(): Promise<Wallet> {
  let pk: string | null = null;
  try { pk = sessionStorage.getItem(TEMP_KEY); } catch { /* ignore */ }
  if (!pk) {
    pk = generatePrivateKey();
    try { sessionStorage.setItem(TEMP_KEY, pk); } catch { /* ignore */ }
  }
  const account = createAccount(pk as `0x${string}`);
  const client = createClient({ chain: studionet, account });
  try {
    const bal = await client.getBalance({ address: account.address });
    if (bal < 20000000000000000000n) {
      await client.request({ method: 'sim_fundAccount', params: [account.address, 100000000000000000000] });
    }
  } catch { /* funding is best-effort; writes will surface any shortfall */ }
  return { mode: 'temporary', address: String(account.address).toLowerCase(), client, signer_mode: 'BROWSER_EPHEMERAL_TEST_ACCOUNT' };
}
export function rotateTemporaryAccount() {
  try { sessionStorage.removeItem(TEMP_KEY); sessionStorage.removeItem(TEMP_ACK); } catch { /* ignore */ }
  return temporaryAccount();
}
export function destroyTemporaryAccount() {
  try { sessionStorage.removeItem(TEMP_KEY); sessionStorage.removeItem(TEMP_ACK); } catch { /* ignore */ }
}

export async function sendWriteOnly(wallet: Wallet, functionName: string, args: any[], value = 0n) {
  if (!wallet?.client) throw new Error('NO_SIGNER');
  await ensureInjectedChain(wallet);
  const hash = await wallet.client.writeContract({ address: contractAddress() as `0x${string}`, functionName, args, value, leaderOnly: false });
  return hash as string;
}
export async function sendWrite(wallet: Wallet, functionName: string, args: any[], value = 0n) {
  const hash = await sendWriteOnly(wallet, functionName, args, value);
  const receipt = await waitFinalized(hash);
  return { hash, receipt };
}

export const shortAddr = (a: string) => (a ? a.slice(0, 6) + '…' + a.slice(-4) : '—');
export const gen = (wei: number) => (wei / 1e18).toString();
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const fmtReadbackTime = (iso: string) => {
  try { return new Date(iso).toLocaleString(undefined, { timeZoneName: 'short' }); } catch { return iso; }
};
