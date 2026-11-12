// Clean public text check — the mechanical gate for the hard rule:
// public files keep only product, tech and real evidence. Banned:
// other-project names, internal agent/handover language, internal
// process terms, and work-directory paths. Run before every push:
//   npm run check-clean
// Exits 1 and lists every hit. The built bundle (docs/assets) is
// derived from src/, so it is not scanned separately.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PATTERNS = [
  // Other GenLayer projects (this repo is CallSettle only).
  'TenderCourt', 'LinguaCourt', 'MatchRoot', 'FairGate', 'MochiCurve',
  'AfterHours', 'Volta', 'Heliosophia', 'Veridict', 'DuelForge',
  'CommitMark', 'ForkSeal', 'GrantWeave', 'SketchVerdict', 'FakeHall',
  'BountyBoard', 'TaskPrism', 'SealedVote', 'TokenWeave', 'CoPack',
  'TraceFence', 'RewindTable', 'LexCuria', 'DualRate', 'Reclaim',
  'SkillGraph', 'StampPass', 'WeatherProof', 'TimeSeal', 'Sentinel',
  'AgentCheck', 'ISBNRegistry', 'Merkle Distributor',
  // Internal agent / handover language.
  'main agent', 'builder agent', 'subagent', 'GPT', 'Gemini',
  'handover', 'Muse',
  // Internal process terms and work-directory paths.
  'checkpoint rule', 'delivery status', 'workdir', 'DELIVERY-NOTES',
  'workspace/build', '/home/hatch',
];
const SCAN_DIRS = ['contracts', 'src', 'scripts', 'tests', 'evidence', 'docs', 'public'];
const SCAN_ROOT_FILES = ['README.md', 'EXPECTED.md', 'EVIDENCE.md', 'REVIEWER.md', 'index.html'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'assets', '__pycache__']);
const SKIP_FILES = new Set(['package-lock.json', 'check_clean_text.mjs']);

const hits = [];
function scanFile(p) {
  const text = fs.readFileSync(p, 'utf8');
  const lines = text.split('\n');
  for (const pat of PATTERNS) {
    const re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    lines.forEach((line, i) => {
      if (re.test(line)) hits.push(`${path.relative(REPO, p)}:${i + 1}: [${pat}] ${line.trim().slice(0, 120)}`);
    });
  }
}
function walk(dir) {
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    if (SKIP_DIRS.has(e.name) || SKIP_FILES.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(py|md|json|tsx|ts|mjs|js|html|css)$/.test(e.name)) scanFile(p);
  }
}
for (const d of SCAN_DIRS) {
  const p = path.join(REPO, d);
  if (fs.existsSync(p)) walk(p);
}
for (const f of SCAN_ROOT_FILES) {
  const p = path.join(REPO, f);
  if (fs.existsSync(p)) scanFile(p);
}
if (hits.length > 0) {
  console.log(`CLEAN-TEXT CHECK FAILED: ${hits.length} hit(s)`);
  for (const h of hits) console.log(' ', h);
  process.exit(1);
}
console.log('CLEAN-TEXT CHECK PASS: no banned phrases in public files');
