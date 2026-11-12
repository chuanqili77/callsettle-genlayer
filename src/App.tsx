// CallSettle frontend — structure grown from the mechanism, not from a
// template. Three parts, three objects:
//   1. Switchboard — endpoints are LINES on a board (rows, not cards).
//   2. Call slip — one call is a TICKET with a perforated edge.
//   3. Settlement tape — every call is a RECEIPT on a continuous roll,
//      newest on top; the verdict arrives as a rubber STAMP.
// The meter strip on top is a fare-meter face, not a stat-card row.
// Default language is English. Chinese is opt-in via the toggle and is
// remembered; the browser language is never read. On-chain values are
// always English. Gate 11: every displayed value comes from a
// latest-final readback; before that, only UNCONFIRMED is shown.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadDeployment, readAll, connectInjected, temporaryAccount,
  rotateTemporaryAccount, destroyTemporaryAccount, isTempKeyAcked,
  ackTempKey, tempPrivateKey, sendWriteOnly, waitFinalized, savePendingTx,
  loadPendingTxs, clearPendingTx, saveMyTx, loadMyTxs, leaderExecution, leaderPayload, txGood,
  TxUnknownError, explorerTx, explorerAddress, shortAddr, gen, fmtReadbackTime,
  GEN_WEI, MIN_PRICE_GEN, MAX_PRICE_GEN, walletKind,
  type Deployment, type EndpointRec, type CallRec, type Counts, type Wallet,
} from './chain';
import { DICTS, type Lang, type Dict } from './i18n';

const LANG_KEY = 'callsettle-lang';
function initialLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === 'zh' ? 'zh' : 'en';
  } catch { return 'en'; }
}
const STATIC_MODE = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).has('static');

function useCountUp(value: number, active: boolean): number {
  const [shown, setShown] = useState(0);
  const reduce = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (!active || STATIC_MODE || reduce) { setShown(value); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 600);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, active, reduce]);
  return shown;
}

function Meter({ label, value, unit, active }: { label: string; value: number; unit: string; active: boolean }) {
  const shown = useCountUp(value, active);
  return (
    <div className="meter-cell">
      <div className="meter-value">{active ? shown.toLocaleString('en-US') : '—'}</div>
      <div className="meter-label">{label}{unit ? ` · ${unit}` : ''}</div>
    </div>
  );
}

// The buyer sees the ACTUAL API response data for a call, not just a
// receipt. The browser fetches the provider's public endpoint
// directly (Open-Meteo allows cross-origin reads) and shows the
// fields the settlement rule checks. The note is explicit: this is
// the response fetched NOW — validators fetched the same endpoint
// at settlement time, and the verdict was based on that response.
function ResponsePreview({ url, t, buttonLabel }: { url: string; t: Dict; buttonLabel: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [data, setData] = useState<any>(null);
  async function fetchNow() {
    setState('loading');
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setData(await res.json());
      setState('ok');
    } catch {
      setState('error');
    }
  }
  const cur = data?.current ?? null;
  return (
    <div className="response-box">
      <div className="response-head">
        <strong>{t.responseTitle}</strong>
        {state === 'idle' && <button onClick={fetchNow}>{buttonLabel}</button>}
        {state === 'loading' && <span>{t.responseLoading}</span>}
        {state === 'ok' && <button onClick={() => setState('idle')}>{t.responseHide}</button>}
        {state === 'error' && <button onClick={fetchNow}>{buttonLabel}</button>}
      </div>
      {state === 'ok' && (
        <div className="response-lines">
          {cur && typeof cur.temperature_2m === 'number' && (
            <div><span>{t.responseTemp}</span><strong>{cur.temperature_2m} °C</strong></div>
          )}
          {cur && typeof cur.time === 'string' && (
            <div><span>{t.responseTime}</span><strong className="mono">{cur.time}</strong></div>
          )}
          {cur && typeof cur.wind_speed_10m === 'number' && (
            <div><span>{t.responseWind}</span><strong>{cur.wind_speed_10m} km/h</strong></div>
          )}
          {!cur && <div><span>{t.fieldsNo}</span><strong>current</strong></div>}
          <details>
            <summary>{t.responseRaw}</summary>
            <pre className="mono response-raw">{JSON.stringify(data, null, 2)}</pre>
          </details>
        </div>
      )}
      {state === 'error' && <p className="inline-error">{t.responseError}</p>}
      <p className="response-note">{t.responseNote}</p>
    </div>
  );
}

// Strict Open-Meteo forecast gate, mirroring the contract:
// exactly the forecast path, optionally followed by a query string.
// A junk path such as /v1/forecastXYZ is rejected.
function validOpenMeteoUrl(url: string): boolean {
  const prefix = 'https://api.open-meteo.com/v1/forecast';
  if (!url.startsWith(prefix)) return false;
  const rest = url.slice(prefix.length);
  return rest === '' || rest.startsWith('?');
}

interface Readback { endpoints: EndpointRec[]; calls: CallRec[]; counts: Counts; is_finalized_readback: boolean; at: string }
interface EvTx { label: string; hash: string; result: string; verdict?: string; expected_error?: string }

export default function App() {
  const [lang, setLang] = useState<Lang>(initialLang);
  const t: Dict = DICTS[lang];
  const switchLang = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  };
  const [dep, setDep] = useState<Deployment | null>(null);
  const [rb, setRb] = useState<Readback | null>(null);
  const [rbError, setRbError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletError, setWalletError] = useState('');
  const [evTxs, setEvTxs] = useState<EvTx[]>([]);
  const [browserTxs, setBrowserTxs] = useState<EvTx[]>([]);
  const [myTxs, setMyTxs] = useState<EvTx[]>(() => loadMyTxs());
  const [pending, setPending] = useState<{ hash: string; label: string }[]>(() => loadPendingTxs());
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<number | null>(null);
  const [listUrl, setListUrl] = useState('');
  const [listPrice, setListPrice] = useState('3');
  const [listNote, setListNote] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [keyModal, setKeyModal] = useState<null | { action: () => Promise<void> }>(null);
  const [keyAcked, setKeyAcked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmDisc, setConfirmDisc] = useState(false);
  const [panelKeyCopied, setPanelKeyCopied] = useState(false);
  const lastTxRef = useRef<{ hash: string; label: string } | null>(null);

  const refresh = useCallback(async (): Promise<Readback | null> => {
    setRefreshing(true);
    setRbError('');
    try {
      const data = await readAll();
      setRb(data);
      return data;
    } catch (e: any) {
      setRbError(e?.message || String(e));
      return null;
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const d = await loadDeployment();
        setDep(d);
        setMyTxs(loadMyTxs());
        setPending(loadPendingTxs());
        await refresh();
        try {
          const res = await fetch('./transactions.json', { cache: 'no-store' });
          if (res.ok) {
            const j = await res.json();
            if (Array.isArray(j.transactions)) setEvTxs(j.transactions);
          }
        } catch { /* evidence file is optional on the live site */ }
        try {
          const resB = await fetch('./browser-transactions.json', { cache: 'no-store' });
          if (resB.ok) {
            const j = await resB.json();
            if (Array.isArray(j.transactions)) setBrowserTxs(j.transactions);
          }
        } catch { /* browser-run file is optional on the live site */ }
      } catch (e: any) {
        setRbError(e?.message || String(e));
      }
    })();
  }, [refresh]);

  // Resume polling for txs that were sent but never observed FINALIZED.
  useEffect(() => {
    if (pending.length === 0) return;
    let stop = false;
    (async () => {
      for (const p of pending) {
        if (stop) return;
        try {
          await waitFinalized(p.hash);
          clearPendingTx(p.hash);
          setPending((ps) => ps.filter((x) => x.hash !== p.hash));
        } catch { /* still unknown: keep polling next refresh */ }
      }
      await refresh();
    })();
    return () => { stop = true; };
  }, [pending.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const myAddr = wallet?.address || '';
  const endpoints = useMemo(() => rb?.endpoints ?? [], [rb]);
  const calls = useMemo(() => [...(rb?.calls ?? [])].sort((a, b) => b.call_id - a.call_id), [rb]);
  const counts = rb?.counts;
  const readbackOk = !!rb?.is_finalized_readback;

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const shortTx = (h: string) => (h.length > 20 ? h.slice(0, 10) + '…' + h.slice(-6) : h);
  const txActionLabel = (a: string) =>
    a === 'call' ? t.txCall : a === 'settle' ? t.txSettle : a === 'cancel' ? t.txCancel : t.txWithdraw;
  const txActionOrder = (a: string) =>
    a === 'call' ? 0 : a === 'settle' ? 1 : a === 'cancel' ? 2 : 3;

  // Every transaction that belongs to one call, from all three sources:
  // the scripted evidence file, the browser-write-loop file, and this
  // tab's own append-only history. Before a FINALIZED readback the
  // caller shows '—' instead; after it, the real hash (short + link).
  // A call made in this tab is first recorded as `call-e{id}` (its call
  // id is unknown until the post-tx readback) and relabelled to
  // `c{id}-call` by doWrite; the fallback below covers a tab that was
  // reloaded before that relabelling ran.
  function txsForCall(c: CallRec): { action: string; hash: string; result: string; verdict?: string; source: 'evidence' | 'browser' }[] {
    const out: { action: string; hash: string; result: string; verdict?: string; source: 'evidence' | 'browser' }[] = [];
    const push = (list: EvTx[], source: 'evidence' | 'browser') => {
      for (const x of list) {
        const m = new RegExp(`^c${c.call_id}-(call|settle|cancel|provider-withdraw|buyer-withdraw)$`).exec(x.label);
        if (m) out.push({ action: m[1] === 'provider-withdraw' || m[1] === 'buyer-withdraw' ? 'withdraw' : m[1], hash: x.hash, result: x.result, verdict: x.verdict, source });
      }
    };
    push(evTxs, 'evidence');
    push(browserTxs, 'browser');
    push(myTxs, 'browser');
    if (!out.some((o) => o.action === 'call')) {
      const cands = myTxs.filter((x) => x.label === `call-e${c.endpoint_id}`);
      const newestOnEndpoint = Math.max(...calls.filter((x) => x.endpoint_id === c.endpoint_id).map((x) => x.call_id));
      if (cands.length === 1 && c.call_id === newestOnEndpoint) {
        out.push({ action: 'call', hash: cands[0].hash, result: cands[0].result || 'ok', source: 'browser' });
      }
    }
    const seen = new Set<string>();
    return out
      .filter((o) => (seen.has(o.hash) ? false : (seen.add(o.hash), true)))
      .sort((a, b) => txActionOrder(a.action) - txActionOrder(b.action));
  }

  async function doWrite(label: string, fn: string, args: any[], value = 0n, payable = false) {
    if (!wallet) { setError(t.connectWallet); return; }
    if (wallet.mode === 'temporary' && payable && !isTempKeyAcked()) {
      setKeyModal({ action: () => doWrite(label, fn, args, value, payable) });
      return;
    }
    setError(''); setNotice('');
    setBusy(label);
    try {
      const hash = await sendWriteOnly(wallet, fn, args, value);
      lastTxRef.current = { hash, label };
      savePendingTx(hash, label);
      saveMyTx(hash, label);
      setMyTxs(loadMyTxs());
      setPending((ps) => [...ps, { hash, label }]);
      setNotice(t.waitingFinal + ' ' + hash);
      const receipt = await waitFinalized(hash);
      clearPendingTx(hash);
      setPending((ps) => ps.filter((x) => x.hash !== hash));
      if (!txGood(receipt)) {
        setError(`${t.errorTitle}: ${leaderExecution(receipt) || ''} ${leaderPayload(receipt)}`.trim());
      } else {
        setNotice(t.done + ' — ' + hash);
      }
      const data = await refresh();
      if (fn === 'call_api' && data) {
        // The new call id is only known after the readback: the newest
        // call on this endpoint by this buyer is the one just made
        // (writes are serial — the UI blocks concurrent sends).
        const mine = data.calls
          .filter((cc) => cc.endpoint_id === Number(args[0]) && cc.buyer === wallet.address.toLowerCase())
          .sort((a, b) => b.call_id - a.call_id);
        if (mine.length > 0) {
          saveMyTx(hash, `c${mine[0].call_id}-call`);
          setMyTxs(loadMyTxs());
        }
      }
    } catch (e: any) {
      if (e instanceof TxUnknownError) {
        setNotice(t.pendingNote + ' ' + e.hash);
      } else {
        setError(`${t.errorTitle}: ${e?.shortMessage || e?.message || String(e)}`);
      }
      await refresh();
    } finally {
      setBusy('');
    }
  }

  async function onConnectInjected() {
    setWalletError('');
    try { setWallet(await connectInjected()); }
    catch (e: any) { setWalletError(e?.message || String(e)); }
  }
  async function onUseTemp() {
    setWalletError('');
    try { setWallet(await temporaryAccount()); }
    catch (e: any) { setWalletError(e?.message || String(e)); }
  }
  async function onRotateTemp() {
    try { setWallet(await rotateTemporaryAccount()); } catch (e: any) { setWalletError(e?.message || String(e)); }
  }
  function onDisconnect() {
    if (wallet?.mode === 'temporary') destroyTemporaryAccount();
    setWallet(null);
  }

  function exportReceipts() {
    if (!readbackOk || !rb || !dep) return;
    const payload = {
      network: 'Stable Studionet', chain_id: 61999,
      contract_address: dep.contract_address, deploy_tx: dep.deploy_tx,
      source_sha256: dep.source_sha256, readback_at: rb.at,
      is_finalized_readback: true, counts: rb.counts,
      endpoints: rb.endpoints, calls: rb.calls,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'callsettle-receipts.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const verdictClass = (v: string) =>
    v === 'RESPONSE_VALID' ? 'stamp-valid' : v === 'RESPONSE_INVALID' ? 'stamp-invalid' : v === 'UNREACHABLE' ? 'stamp-unreachable' : 'stamp-pending';
  const statusText = (c: CallRec) =>
    c.status === 'FUNDED' ? t.funded : c.status === 'SETTLED' ? t.settled : c.status === 'REFUNDED' ? t.refunded : t.cancelled;

  const selEndpoint = endpoints.find((e) => e.endpoint_id === selectedEndpoint) || null;

  return (
    <div className="page">
      <header className="masthead">
        <div className="brand">
          <div className="brand-mark">◉</div>
          <div>
            <div className="brand-name">CallSettle</div>
            <div className="brand-tag">{t.tagline}</div>
          </div>
        </div>
        <div className="masthead-right">
          <button className="lang-toggle" onClick={() => switchLang(lang === 'en' ? 'zh' : 'en')} aria-label="Switch language">
            {lang === 'en' ? '中文' : 'EN'}
          </button>
          <button className="wallet-btn" onClick={wallet ? () => { setAccountOpen(true); setConfirmDisc(false); setPanelKeyCopied(false); } : onConnectInjected}>
            {wallet ? `${t.connectedAs} ${shortAddr(wallet.address)}` : t.connectWallet}
          </button>
        </div>
      </header>

      <section className="hero">
        <h1>{t.heroTitle}</h1>
        <p className="hero-sub">{t.heroSub}</p>
        <div className="hero-links">
          <a href="#board">{t.heroCtaStore}</a>
          <a href="#slip">{t.heroCtaConsole}</a>
        </div>
      </section>

      <section className="meter" aria-label={t.meterTitle}>
        <div className="meter-face">
          <Meter label={t.endpointsCount} value={counts?.endpoint_count ?? 0} unit="" active={readbackOk} />
          <Meter label={t.callsCount} value={counts?.call_count ?? 0} unit="" active={readbackOk} />
          <Meter label={t.escrowed} value={counts ? Number(counts.escrowed_wei) / 1e18 : 0} unit="GEN" active={readbackOk} />
          <Meter label={t.violations} value={counts?.total_violations ?? 0} unit="" active={readbackOk} />
        </div>
        <div className="meter-foot">
          {readbackOk
            ? <span className="ok-dot">● {t.readbackOk} · {t.readbackAt}: {fmtReadbackTime(rb!.at)}</span>
            : <span className="warn-dot">○ {t.unconfirmed} — {t.unconfirmedNote}</span>}
          <button className="refresh-btn" onClick={refresh} disabled={refreshing}>
            {refreshing ? t.refreshing : t.refresh}
          </button>
        </div>
        {rbError && <p className="inline-error">{t.errorTitle}: {rbError}</p>}
      </section>

      {wallet && wallet.mode === 'temporary' && (
        <aside className="risk-banner" role="alert">
          <strong>{t.tempAccount} · {shortAddr(wallet.address)}</strong>
          <span>{t.tempRisk}</span>
          <button onClick={onRotateTemp}>{t.newTemp}</button>
        </aside>
      )}
      {walletError && <p className="inline-error">{t.errorTitle}: {walletError}</p>}
      {!wallet && (
        <section className="wallet-row">
          <span className="wallet-row-label">{t.walletTitle} · {walletKind()}</span>
          <button onClick={onConnectInjected}>{t.connectWallet}</button>
          <button onClick={onUseTemp}>{t.useTemp}</button>
          <span className="wallet-row-note">{t.tempNote}</span>
        </section>
      )}
      {pending.length > 0 && (
        <section className="pending-box">
          <strong>{t.pendingTitle}</strong>
          <span>{t.pendingNote}</span>
          {pending.map((p) => (
            <div key={p.hash} className="mono">{p.label} · <a href={explorerTx(p.hash)} target="_blank" rel="noreferrer">{p.hash}</a></div>
          ))}
        </section>
      )}
      {notice && <p className="notice mono">{notice}</p>}
      {error && <p className="inline-error">{error} — {t.errorRetry}</p>}

      <main>
        <section id="board" className="board">
          <div className="section-head">
            <h2>{t.boardTitle}</h2>
            <p>{t.boardSub}</p>
          </div>
          {!readbackOk && <p className="unconfirmed-line">{t.unconfirmed} — {t.unconfirmedNote}</p>}
          {endpoints.length === 0 && readbackOk && <p>{t.noEndpoints}</p>}
          <ol className="lines">
            {endpoints.map((e) => (
              <li key={e.endpoint_id} className="line">
                <div className="jack">E{e.endpoint_id}</div>
                <div className="line-body">
                  <div className="line-url mono">{e.url}</div>
                  <div className="line-note">{e.schema_note}</div>
                  <div className="line-meta">
                    <span>{t.provider}: {shortAddr(e.provider)}</span>
                    <span>{e.calls} {t.callsMade}</span>
                    <span>{e.settled_valid} {t.validSettled}</span>
                    <span>{e.violations} {t.violations}</span>
                  </div>
                </div>
                <div className="line-right">
                  <div className="price-tag">{e.price_gen} GEN <span>{t.pricePerCall}</span></div>
                  <button
                    className="plug-btn"
                    disabled={!readbackOk || !wallet || busy !== ''}
                    onClick={() => { setSelectedEndpoint(e.endpoint_id); document.getElementById('slip')?.scrollIntoView({ behavior: STATIC_MODE ? 'auto' : 'smooth' }); }}
                  >
                    {t.plugIn}
                  </button>
                </div>
              </li>
            ))}
          </ol>

          <details className="add-line">
            <summary>{t.addLine}</summary>
            <p>{t.listSub}</p>
            <label>{t.urlLabel}
              <input value={listUrl} onChange={(ev) => setListUrl(ev.target.value)} placeholder={t.urlPh} inputMode="url" />
            </label>
            <label>{t.priceLabel}
              <input value={listPrice} onChange={(ev) => setListPrice(ev.target.value)} inputMode="numeric" />
            </label>
            <label>{t.noteLabel}
              <textarea value={listNote} onChange={(ev) => setListNote(ev.target.value)} placeholder={t.notePh} rows={3} />
            </label>
            <p className="note-unverified">{t.noteUnverified}</p>
            <button
              disabled={!wallet || busy !== '' || !validOpenMeteoUrl(listUrl.trim())}
              onClick={() => {
                const price = Number(listPrice);
                if (!Number.isInteger(price) || price < MIN_PRICE_GEN || price > MAX_PRICE_GEN) {
                  setError(`${t.errorTitle}: price must be an integer ${MIN_PRICE_GEN}–${MAX_PRICE_GEN} GEN`);
                  return;
                }
                void doWrite('list-endpoint', 'list_endpoint', [listUrl.trim(), price, listNote.trim()]);
              }}
            >
              {busy === 'list-endpoint' ? t.sending : t.listBtn}
            </button>
          </details>
        </section>

        <section id="slip" className="slip-wrap">
          <div className="section-head">
            <h2>{t.consoleTitle}</h2>
            <p>{t.consoleSub}</p>
          </div>
          <div className="slip">
            <div className="slip-perforation" aria-hidden="true" />
            <div className="slip-row">
              <span>{t.endpoint}</span>
              <select
                value={selectedEndpoint ?? ''}
                onChange={(ev) => setSelectedEndpoint(ev.target.value ? Number(ev.target.value) : null)}
              >
                <option value="">{t.selectEndpoint}</option>
                {endpoints.map((e) => (
                  <option key={e.endpoint_id} value={e.endpoint_id}>E{e.endpoint_id} · {e.price_gen} GEN · {e.url.slice(0, 48)}{e.url.length > 48 ? '…' : ''}</option>
                ))}
              </select>
            </div>
            <div className="slip-row"><span>{t.pricePerCall}</span><strong>{selEndpoint ? `${selEndpoint.price_gen} GEN` : '—'}</strong></div>
            <div className="slip-row"><span>{t.buyer}</span><span className="mono">{wallet ? shortAddr(wallet.address) : '—'}</span></div>
            <div className="slip-row"><span>{t.provider}</span><span className="mono">{selEndpoint ? shortAddr(selEndpoint.provider) : '—'}</span></div>
            <button
              className="slip-pay"
              disabled={!wallet || !selEndpoint || busy !== ''}
              onClick={() => selEndpoint && void doWrite(`call-e${selEndpoint.endpoint_id}`, 'call_api', [selEndpoint.endpoint_id], BigInt(selEndpoint.price_gen) * GEN_WEI, true)}
            >
              {busy.startsWith('call-e') ? t.sending : t.callBtn}
            </button>
            {!wallet && <p className="slip-hint">{t.connectWallet} / {t.useTemp}</p>}
            {selEndpoint && (
              <ResponsePreview url={selEndpoint.url} t={t} buttonLabel={t.responsePreview} />
            )}
          </div>
        </section>

        <section className="tape">
          <div className="section-head">
            <h2>{t.tapeTitle}</h2>
            <p>{t.tapeSub}</p>
          </div>
          <div className="tape-actions">
            <button onClick={exportReceipts} disabled={!readbackOk} title={readbackOk ? '' : t.exportDisabled}>
              {t.exportBtn}
            </button>
            {!readbackOk && <span className="unconfirmed-line">{t.exportDisabled}</span>}
          </div>
          {!readbackOk && <p className="unconfirmed-line">{t.unconfirmed} — {t.unconfirmedNote}</p>}
          {calls.length === 0 && readbackOk && <p>{t.noCalls}</p>}
          <ol className="receipts">
            {calls.map((c) => {
              const isMine = !!myAddr && (c.buyer === myAddr || c.provider === myAddr);
              const myProviderCredit = myAddr === c.provider && c.provider_credit > 0 && !c.provider_withdrawn;
              const myBuyerCredit = myAddr === c.buyer && c.buyer_credit > 0 && !c.buyer_withdrawn;
              const canCancel = myAddr === c.buyer && c.status === 'FUNDED';
              const open = expanded.has(c.call_id);
              const callTxs = txsForCall(c);
              return (
                <li key={c.call_id} className="receipt">
                  <div className="receipt-head">
                    <span className="receipt-title">CALLSETTLE · {t.receipt}</span>
                    <span className="receipt-id">#{c.call_id}</span>
                  </div>
                  <div className="receipt-lines">
                    <div><span>{t.endpoint}</span><span className="mono">E{c.endpoint_id}</span></div>
                    <div><span>{t.buyer}</span><span className="mono">{shortAddr(c.buyer)}</span></div>
                    <div><span>{t.provider}</span><span className="mono">{shortAddr(c.provider)}</span></div>
                    <div><span>{t.pricePerCall}</span><strong>{c.price_gen} GEN</strong></div>
                    <div><span>{t.status}</span><strong>{statusText(c)}</strong></div>
                    <div><span>{t.verdict}</span><strong>{c.verdict || '—'}</strong></div>
                    <div><span>{t.band}</span><strong>{c.temperature_band || '—'}</strong></div>
                    <div><span>{t.fieldsOk} / {t.fieldsNo}</span><strong>{c.has_required_fields ? t.fieldsOk : t.fieldsNo}</strong></div>
                    {c.status === 'FUNDED' && <div className="alloc-zero"><span>{t.fundedAlloc}</span><strong>{t.amountZero}</strong></div>}
                    {c.status === 'SETTLED' && <div><span>{t.withdrawProvider}</span><strong>{gen(c.provider_credit)} GEN · {c.provider_withdrawn ? t.withdrawn : t.awaitingWithdraw}</strong></div>}
                    {c.status === 'REFUNDED' && <div><span>{t.withdrawBuyer}</span><strong>{gen(c.buyer_credit)} GEN · {c.buyer_withdrawn ? t.withdrawn : t.awaitingWithdraw}</strong></div>}
                    {c.status === 'CANCELLED' && c.buyer_credit > 0 && <div><span>{t.withdrawBuyer}</span><strong>{gen(c.buyer_credit)} GEN · {c.buyer_withdrawn ? t.withdrawn : t.awaitingWithdraw}</strong></div>}
                  </div>
                  {c.verdict && (
                    <div className={`stamp ${verdictClass(c.verdict)}`} aria-label={c.verdict}>{c.verdict}</div>
                  )}
                  {c.verdict === 'RESPONSE_VALID' && <p className="verdict-meaning">{t.meaningValid}</p>}
                  {c.verdict === 'RESPONSE_INVALID' && <p className="verdict-meaning">{t.meaningInvalid}</p>}
                  {c.verdict === 'UNREACHABLE' && <p className="verdict-meaning">{t.meaningUnreachable}</p>}
                  {c.status === 'FUNDED' && (
                    <div className="stamp stamp-pending" aria-label="FUNDED">FUNDED</div>
                  )}
                  <div className="receipt-actions">
                    <button onClick={() => toggleExpand(c.call_id)}>
                      {open ? t.receiptCollapse : t.receiptExpand}
                    </button>
                    {c.status === 'FUNDED' && (
                      <button disabled={!wallet || busy !== ''} onClick={() => void doWrite(`settle-c${c.call_id}`, 'settle_call', [c.call_id])}>
                        {busy === `settle-c${c.call_id}` ? t.sending : t.settleBtn}
                      </button>
                    )}
                    {canCancel && (
                      <button disabled={busy !== ''} onClick={() => void doWrite(`cancel-c${c.call_id}`, 'cancel_call', [c.call_id])}>
                        {busy === `cancel-c${c.call_id}` ? t.sending : t.cancelBtn}
                      </button>
                    )}
                    {(myProviderCredit || myBuyerCredit) && (
                      <button disabled={busy !== ''} onClick={() => void doWrite(`withdraw-c${c.call_id}`, 'withdraw', [c.call_id])}>
                        {busy === `withdraw-c${c.call_id}` ? t.sending : myProviderCredit ? `${t.withdrawProviderBtn} · ${gen(c.provider_credit)} GEN` : `${t.withdrawBuyerBtn} · ${gen(c.buyer_credit)} GEN`}
                      </button>
                    )}
                    {!isMine && myAddr && <span className="receipt-note">{t.allCalls}</span>}
                  </div>
                  {open && (
                    <div className="receipt-detail">
                      {!readbackOk ? (
                        <div className="tx-row"><span>{t.txHash}</span><span>—</span></div>
                      ) : callTxs.length === 0 ? (
                        <div className="tx-row"><span>{t.txHash}</span><span>—</span></div>
                      ) : (
                        callTxs.map((x) => (
                          <div key={x.hash} className="tx-row">
                            <span>{txActionLabel(x.action)}</span>
                            <a className="mono" href={explorerTx(x.hash)} target="_blank" rel="noreferrer">{shortTx(x.hash)}</a>
                            <span>{x.result}{x.verdict ? ` · ${x.verdict}` : ''}</span>
                            {x.source === 'browser' && <span className="tx-source">{t.browserRun}</span>}
                          </div>
                        ))
                      )}
                      {(() => {
                        const ep = endpoints.find((e) => e.endpoint_id === c.endpoint_id);
                        return ep ? <ResponsePreview url={ep.url} t={t} buttonLabel={t.responseShow} /> : null;
                      })()}
                      <p>{t.receipt} #{c.call_id} — {t.readbackOk}: {readbackOk ? fmtReadbackTime(rb!.at) : t.unconfirmed}</p>
                      {(myProviderCredit || myBuyerCredit) && (
                        <div className="withdraw-block">
                          <button disabled={busy !== ''} onClick={() => void doWrite(`withdraw-c${c.call_id}`, 'withdraw', [c.call_id])}>
                            {busy === `withdraw-c${c.call_id}` ? t.sending : myProviderCredit ? `${t.withdrawProviderBtn} · ${gen(c.provider_credit)} GEN` : `${t.withdrawBuyerBtn} · ${gen(c.buyer_credit)} GEN`}
                          </button>
                        </div>
                      )}
                      {!myProviderCredit && !myBuyerCredit && c.provider_credit > 0 && !c.provider_withdrawn && (
                        <div className="withdraw-note">
                          <button disabled>{`${t.withdrawProviderBtn} · ${gen(c.provider_credit)} GEN`}</button>
                          <span>{t.withdrawByProvider} · <span className="mono">{shortAddr(c.provider)}</span></span>
                        </div>
                      )}
                      {!myProviderCredit && !myBuyerCredit && c.buyer_credit > 0 && !c.buyer_withdrawn && (
                        <div className="withdraw-note">
                          <button disabled>{`${t.withdrawBuyerBtn} · ${gen(c.buyer_credit)} GEN`}</button>
                          <span>{t.withdrawByBuyer} · <span className="mono">{shortAddr(c.buyer)}</span></span>
                        </div>
                      )}
                      {(c.provider_withdrawn || c.buyer_withdrawn) && (
                        <div className="tx-row"><span>{t.withdrawn}</span><strong>{gen(c.provider_withdrawn ? c.provider_credit : c.buyer_credit)} GEN</strong></div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <section className="evidence">
          <div className="section-head">
            <h2>{t.evidenceTitle}</h2>
            <p>{t.evidenceSub}</p>
          </div>
          <dl className="evidence-list">
            <div><dt>{t.claim}</dt><dd>{t.claimText}</dd></div>
            <div><dt>{t.anchor}</dt><dd>{t.anchorText}</dd></div>
            <div><dt>{t.contract}</dt><dd className="mono">
              {dep ? dep.contract_address : t.unconfirmed}
              {dep && <> · <a href={explorerAddress(dep.contract_address)} target="_blank" rel="noreferrer">{t.explorer}</a></>}
            </dd></div>
            <div><dt>{t.sourceSha}</dt><dd className="mono">{dep ? dep.source_sha256 : t.unconfirmed}</dd></div>
            <div><dt>{t.deployTx}</dt><dd className="mono">
              {dep ? <a href={explorerTx(dep.deploy_tx)} target="_blank" rel="noreferrer">{dep.deploy_tx}</a> : t.unconfirmed}
            </dd></div>
            <div><dt>{t.notProve}</dt><dd>{t.notProveText}</dd></div>
            <div><dt>{t.knownLimits}</dt><dd>{t.limitsText}</dd></div>
          </dl>
          <h3>{t.evidenceTable}</h3>
          {evTxs.length === 0
            ? <p>{t.unconfirmed}</p>
            : <ul className="ev-list mono">
              {evTxs.map((x) => (
                <li key={x.label}>
                  {x.label} · <a href={explorerTx(x.hash)} target="_blank" rel="noreferrer">{x.hash.slice(0, 18)}…</a> · {x.result}
                  {x.verdict ? ` · ${x.verdict}` : ''}{x.expected_error ? ` · ${x.expected_error}` : ''}
                </li>
              ))}
            </ul>}
          <h3>{t.machineView}</h3>
          <p>{t.machineNote}</p>
          <pre className="machine mono">{[
            `network: Stable Studionet`,
            `chain_id: 61999`,
            `contract: ${dep?.contract_address ?? 'UNCONFIRMED'}`,
            `deploy_tx: ${dep?.deploy_tx ?? 'UNCONFIRMED'}`,
            `source_sha256: ${dep?.source_sha256 ?? 'UNCONFIRMED'}`,
            `readback_finalized: ${readbackOk}`,
            `endpoints: ${counts?.endpoint_count ?? 'UNCONFIRMED'}`,
            `calls: ${counts?.call_count ?? 'UNCONFIRMED'}`,
            `violations: ${counts?.total_violations ?? 'UNCONFIRMED'}`,
            `received_wei: ${counts?.total_received_wei ?? 'UNCONFIRMED'}`,
            `withdrawn_wei: ${counts?.total_withdrawn_wei ?? 'UNCONFIRMED'}`,
            `balance_wei: ${counts?.contract_balance_wei ?? 'UNCONFIRMED'}`,
            ...evTxs.map((x) => `tx ${x.label}: ${x.hash} ${x.result}`),
            ...browserTxs.map((x) => `tx ${x.label}: ${x.hash} ${x.result} (browser)`),
          ].join('\n')}</pre>
        </section>
      </main>

      <footer className="page-foot">
        <span>{t.footerNote}</span>
        <span>{STATIC_MODE ? t.staticNote : ''}</span>
        {dep && <a href={explorerAddress(dep.contract_address)} target="_blank" rel="noreferrer">{dep.contract_address}</a>}
      </footer>

      {accountOpen && wallet && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t.accountTitle}>
          <div className="modal">
            <h3>{t.accountTitle}</h3>
            <div className="receipt-lines">
              <div><span>{t.accountAddress}</span><span className="mono">{wallet.address}</span></div>
              <div><span>{t.accountMode}</span><strong>{wallet.mode === 'temporary' ? t.modeTemp : `${t.modeInjected} · ${walletKind()}`}</strong></div>
            </div>
            {wallet.mode === 'temporary' && <p>{t.tempRisk}</p>}
            {!confirmDisc ? (
              <div className="modal-actions">
                <button onClick={() => setConfirmDisc(true)}>{t.disconnect}</button>
                <button onClick={() => setAccountOpen(false)}>{t.close}</button>
              </div>
            ) : (
              <>
                <p>{wallet.mode === 'temporary' ? t.disconnectBodyTemp : t.disconnectBody}</p>
                {wallet.mode === 'temporary' && (
                  <>
                    <label>{t.yourKey}</label>
                    <p className="mono key-box">{tempPrivateKey() || '—'}</p>
                    <div className="modal-actions">
                      <button onClick={() => { try { navigator.clipboard?.writeText(tempPrivateKey() || ''); setPanelKeyCopied(true); } catch { /* ignore */ } }}>
                        {panelKeyCopied ? t.copied : t.copyKey}
                      </button>
                    </div>
                  </>
                )}
                <div className="modal-actions">
                  <button onClick={() => { onDisconnect(); setAccountOpen(false); setConfirmDisc(false); }}>{t.confirmDisconnect}</button>
                  <button onClick={() => setConfirmDisc(false)}>{t.cancel}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {keyModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t.saveKeyTitle}>
          <div className="modal">
            <h3>{t.saveKeyTitle}</h3>
            <p>{t.saveKeyBody}</p>
            <label>{t.yourKey}</label>
            <p className="mono key-box">{tempPrivateKey() || '—'}</p>
            <div className="modal-actions">
              <button onClick={() => { try { navigator.clipboard?.writeText(tempPrivateKey() || ''); setCopied(true); } catch { /* ignore */ } }}>
                {copied ? t.copied : t.copyKey}
              </button>
              <button onClick={() => {
                const blob = new Blob([tempPrivateKey() || ''], { type: 'text/plain' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'callsettle-temp-key.txt';
                a.click();
                URL.revokeObjectURL(a.href);
              }}>{t.downloadKey}</button>
            </div>
            <label className="ack-row">
              <input type="checkbox" checked={keyAcked} onChange={(ev) => setKeyAcked(ev.target.checked)} />
              {t.ackLabel}
            </label>
            <div className="modal-actions">
              <button disabled={!keyAcked} onClick={() => { ackTempKey(); const a = keyModal.action; setKeyModal(null); setKeyAcked(false); void a(); }}>
                {t.ackBtn}
              </button>
              <button onClick={() => { setKeyModal(null); setKeyAcked(false); }}>{t.disconnect}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
