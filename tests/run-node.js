'use strict';
const fs = require('fs');
const path = require('path');
const ACO = require('../js/aco.js');
const { runAll } = require('./tests.js');

const out = runAll(ACO);
const br = (x) => (x !== 0 && Math.abs(x) < 1e-4 ? Number(x).toExponential(3) : String(Number(Number(x).toFixed(6)))).replace('.', ',');

let md = `Resultado: **${out.passed} de ${out.total} verificações aprovadas** (tolerância absoluta 0,000001).\n\n`;
md += '| Seção | Verificação | Situação | Saída obtida |\n|---|---|---|---|\n';
out.results.forEach((r) => {
  md += `| ${r.section} | ${r.name} | ${r.pass ? 'Aprovado' : 'FALHOU'} | ${r.details.replace(/\|/g, '/')} |\n`;
});

const e = out.experiments.run42;
md += `\n### Histórico da execução 6.4 (semente 42)\n\nMelhor rota acumulada: **${e.bestRoute}**, comprimento **${br(e.bestLength)}**, encontrada na iteração ${e.bestIteration}.\n\n`;
md += '| Iteração | Menor da iteração | Média das formigas | Melhor acumulada | Melhor rota da iteração | τ(A,B) final | τ(A,C) final |\n|---|---|---|---|---|---|---|\n';
md += '| 0 | — | — | ainda não calculada | — | 1 | 1 |\n';
e.history.forEach((h) => {
  md += `| ${h.it} | ${br(h.min)} | ${br(h.avg)} | ${br(h.best)} | ${h.route} | ${br(h.tauAB)} | ${br(h.tauAC)} |\n`;
});

const b = out.experiments.beta;
md += '\n### Comparação β = 0 × β = 2 (seção 6.5)\n\n| Semente | Melhor (β = 0) | Iteração (β = 0) | Melhor (β = 2) | Iteração (β = 2) |\n|---|---|---|---|---|\n';
for (let k = 0; k < 5; k++) {
  const r0 = b[0].runs[k], r2 = b[2].runs[k];
  md += `| ${r0.seed} | ${br(r0.best)} | ${r0.it} | ${br(r2.best)} | ${r2.it} |\n`;
}
md += `| **Média** | **${br(b[0].mean)}** | ${br(b[0].meanFirst)} | **${br(b[2].mean)}** | ${br(b[2].meanFirst)} |\n`;
md += `| **Atingiram 14** | **${b[0].hits}/5** | | **${b[2].hits}/5** | |\n`;
md += `\nMédia das distâncias das formigas na iteração 30: β = 0 → ${br(b[0].meanFinalAvg)}; β = 2 → ${br(b[2].meanFinalAvg)}.\n`;

fs.writeFileSync(path.join(__dirname, 'resultados.md'), md);
out.results.forEach((r) => console.log(`${r.pass ? 'OK   ' : 'FALHA'} [${r.section}] ${r.name}\n      ${r.details}`));
console.log(`\n${out.passed}/${out.total} aprovados`);
process.exit(out.passed === out.total ? 0 : 1);
