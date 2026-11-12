// Report actual Vitest coverage; run with --minimum=80 for a strict gate.
const fs = require('node:fs');
const path = require('node:path');

function findSummary(dir) {
  if (!fs.existsSync(dir)) return null;
  for (const item of fs.readdirSync(dir, {withFileTypes: true})) {
    const file = path.join(dir,item.name);
    if (item.isFile() && item.name === 'coverage-summary.json') return file;
    if (item.isDirectory()) {
      const nested = findSummary(file);
      if (nested) return nested;
    }
  }
  return null;
}

const file = findSummary('coverage');
if (!file) {
  console.error('Vitest coverage summary missing. Run: npm test -- --watch=false --coverage');
  process.exit(1);
}
const summary = JSON.parse(fs.readFileSync(file,'utf8'));
const total = summary.total ?? summary;
const dimensions = ['lines','branches','functions','statements'];
const rows = dimensions.map(k => [k, Number(total[k]?.pct ?? 0)]);
for (const [k,pct] of rows) console.log(`${k}: ${pct.toFixed(2)}%`);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '\n### Vitest - cobertura real frontend\n' +
    rows.map(([k,pct]) => `- ${k}: **${pct.toFixed(2)}%**\n`).join('') +
    '\nMeta: 80% en cada métrica, pendiente si la cifra actual es menor.\n');
}
const minimum = Number(process.argv.find(x => x.startsWith('--minimum='))?.split('=')[1] ?? 0);
if (minimum && rows.some(([,pct]) => pct < minimum)) {
  console.error(`Coverage gate FAIL: every metric must be >= ${minimum}%.`);
  process.exit(2);
}
