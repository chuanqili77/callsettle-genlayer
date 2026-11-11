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
  loadPendingTxs, clearPendingTx, leaderExecution, leaderPayload, txGood,
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
  const lastTxRef = useRef<{ hash: string; label: string } | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRbError('');
    try {
      const data = await readAll();
      setRb(data);
    } catch (e: any) {
      setRbError(e?.message || String(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const d = await loadDeployment();
        setDep(d);
        await refresh();
        try {
          const res = await fetch('./transactions.json', { cache: 'no-store' });
          if (res.ok) {
            const j = await res.json();
            if (Array.isArray(j.transactions)) setEvTxs(j.transactions);
          }
        } catch { /* evidence file is optional on the live site */ }
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
      await refresh();
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
          <button className="wallet-btn" onClick={wallet ? onDisconnect : onConnectInjected}>
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
            <button
              disabled={!wallet || busy !== '' || !listUrl.startsWith('https://api.open-meteo.com/v1/forecast')}
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
                    {c.status === 'SETTLED' && <div><span>{t.withdrawProvider}</span><strong>{gen(c.provider_credit)} GEN</strong></div>}
                    {c.status === 'REFUNDED' && <div><span>{t.withdrawBuyer}</span><strong>{gen(c.buyer_credit)} GEN</strong></div>}
                  </div>
                  {c.verdict && (
                    <div className={`stamp ${verdictClass(c.verdict)}`} aria-label={c.verdict}>{c.verdict}</div>
                  )}
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
                        {busy === `withdraw-c${c.call_id}` ? t.sending : t.withdrawBtn}
                      </button>
                    )}
                    {!isMine && myAddr && <span className="receipt-note">{t.allCalls}</span>}
                  </div>
                  {open && (
                    <div className="receipt-detail">
                      <div><span>{t.txHash}</span><span className="mono">{t.unconfirmed}</span></div>
                      <p>{t.receipt} #{c.call_id} — {t.readbackOk}: {readbackOk ? fmtReadbackTime(rb!.at) : t.unconfirmed}</p>
                      {evTxs.filter((x) => x.label === `c${c.call_id}-call` || x.label === `c${c.call_id}-settle`).map((x) => (
                        <div key={x.label} className="mono">
                          {x.label} · <a href={explorerTx(x.hash)} target="_blank" rel="noreferrer">{x.hash}</a> · {x.result}{x.verdict ? ` · ${x.verdict}` : ''}
                        </div>
                      ))}
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
          ].join('\n')}</pre>
        </section>
      </main>

      <footer className="page-foot">
        <span>{t.footerNote}</span>
        <span>{STATIC_MODE ? t.staticNote : ''}</span>
        {dep && <a href={explorerAddress(dep.contract_address)} target="_blank" rel="noreferrer">{dep.contract_address}</a>}
      </footer>

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
