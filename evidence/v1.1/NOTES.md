# v1.1 archive notes

CallSettle v1.1 (contract 0x58c71cDA976912e9F16438317dE7804523EFaEe6,
protocol callsettle-1.1, deploy tx
0xeb68bda674c14e2e555cd92d372220d72b43448bcef404a17fd110da1cecf4a1) is
superseded by v1.2 and abandoned. v1.2 adds a stricter URL path gate and updates the contract
docstring; the remaining v1.1 logic is identical.

v1.1 final on-chain state (read back 2026-11-12):
- GEN in: 18 (13 scripted + 3 browser C6 + 2 browser C7)
- GEN withdrawn on-chain: 15 (13 scripted + 2 C7 provider withdraw)
- Contract balance: 3 GEN = C6's provider credit to P1
  (0x1535afc1f57f5bc886b98725de455df24a266238), whose evidence-run
  temporary key was deleted after the evidence run. The credit is
  unrecoverable in practice — not "not stranded". Testnet GEN only,
  zero cash cost.

The files in this directory are the v1.1 records as they stood at
supersession (EXPECTED.md, EVIDENCE.md, REVIEWER.md,
transactions.json, deployment.json), with editorial changes to EXPECTED.md and EVIDENCE.md. The earlier
"not stranded" claim is corrected to "unrecoverable in practice"
because the provider signing key was deleted. Transactions,
addresses and amounts are unchanged. Original wording remains
available in git history.
