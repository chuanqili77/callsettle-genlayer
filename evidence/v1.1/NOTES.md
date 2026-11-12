# v1.1 archive notes

CallSettle v1.1 (contract 0x58c71cDA976912e9F16438317dE7804523EFaEe6,
protocol callsettle-1.1, deploy tx
0xeb68bda674c14e2e555cd92d372220d72b43448bcef404a17fd110da1cecf4a1) is
superseded by v1.2 and abandoned. The only v1.2 contract change is
the docstring (other-project names removed) plus a stricter URL
path gate; v1.1 logic is otherwise identical.

v1.1 final on-chain state (read back 2026-11-12):
- GEN in: 18 (13 scripted + 3 browser C6 + 2 browser C7)
- GEN withdrawn on-chain: 15 (13 scripted + 2 C7 provider withdraw)
- Contract balance: 3 GEN = C6's provider credit to P1
  (0x1535afc1f57f5bc886b98725de455df24a266238), whose evidence-run
  temporary key was deleted after the evidence run. The credit is
  unrecoverable in practice — not "not stranded". Testnet GEN only,
  zero cash cost. Disclosed here, not hidden.

The files in this directory are the v1.1 records as they stood at
supersession (EXPECTED.md, EVIDENCE.md, REVIEWER.md,
transactions.json, deployment.json), except that internal phrases
were removed from the EXPECTED.md and EVIDENCE.md copies to meet
the public text rule (a reference to another project and
internal-process wording, plus the "not stranded" claim corrected
to the honest "unrecoverable in practice"); the evidence itself —
transactions, addresses, numbers — is unchanged. The original
wording remains in git history.
