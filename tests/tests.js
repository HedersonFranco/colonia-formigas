(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ACOTests = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TOL = 1e-6;
  const close = (a, b) => Math.abs(a - b) <= TOL;
  const f6 = (x) => x.toFixed(6).replace('.', ',');
  const br = (x) => String(Number(x.toFixed(6))).replace('.', ',');

  const REF = [
    { id: 'A', x: 0, y: 0 },
    { id: 'B', x: 3, y: 0 },
    { id: 'C', x: 3, y: 4 },
    { id: 'D', x: 0, y: 4 },
  ];
  const A = 0, B = 1, C = 2, D = 3;
  const NAMES = 'ABCD';
  const rs = (r) => r.map((i) => NAMES[i]).join(' → ');

  function refConfig(over) {
    return Object.assign(
      { vertices: REF, depot: A, ants: 10, iterations: 30, alpha: 1, beta: 2, rho: 0.5, tau0: 1, Q: 14, seed: 42 },
      over || {}
    );
  }

  function signature(col) {
    return JSON.stringify(col.history.map((r) => [r.ants.map((a) => a.route.join('') + ':' + a.length), r.bestLength])) + JSON.stringify(col.tau);
  }

  function runAll(ACO) {
    const results = [];
    const experiments = {};
    function test(section, name, fn) {
      let r;
      try { r = fn(); } catch (e) { r = { pass: false, details: 'Exceção: ' + (e && e.message) }; }
      results.push({ section, name, pass: !!r.pass, details: r.details || '' });
    }

    const dist = ACO.buildDistanceMatrix(REF);
    const tau1 = ACO.createPheromoneMatrix(4, 1);

    test('6.1', 'Distâncias euclidianas da instância de referência', () => {
      const exp = [[A, B, 3], [A, C, 5], [A, D, 4], [B, C, 4], [B, D, 5], [C, D, 3]];
      const ok = exp.every(([i, j, v]) => close(dist[i][j], v) && close(dist[j][i], v)) && [0, 1, 2, 3].every((i) => dist[i][i] === 0);
      return { pass: ok, details: exp.map(([i, j]) => `${NAMES[i]}-${NAMES[j]} = ${dist[i][j]}`).join('; ') + '; d(i,i) = 0' };
    });

    const ROUTES = [[[A, B, C, D, A], 14], [[A, B, D, C, A], 16], [[A, C, B, D, A], 18], [[A, C, D, B, A], 16], [[A, D, B, C, A], 18], [[A, D, C, B, A], 14]];
    test('6.1', 'Comprimento das seis rotas possíveis a partir de A', () => {
      let ok = true;
      const lines = ROUTES.map(([r, L]) => {
        const got = ACO.routeLength(r, dist);
        ok = ok && close(got, L) && ACO.isValidRoute(r, 4, A);
        return `${rs(r)} = ${got}`;
      });
      return { pass: ok, details: lines.join('; ') };
    });

    test('6.1', 'Rotas incompletas ou com repetição são rejeitadas', () => {
      const bad = [[A, B, C, A], [A, B, B, D, A], [A, B, C, D], [B, A, C, D, B], [A, B, C, D, B]];
      const ok = bad.every((r) => !ACO.isValidRoute(r, 4, A));
      return { pass: ok, details: bad.map(rs).join(' | ') + ' → todas inválidas' };
    });

    test('6.1', 'Rotas construídas pelas formigas são válidas e medem 14, 16 ou 18', () => {
      const col = new ACO.AntColony(refConfig());
      let total = 0;
      let ok = true;
      const lens = new Set();
      while (!col.finished) {
        col.step().ants.forEach((a) => {
          total++;
          lens.add(a.length);
          if (!ACO.isValidRoute(a.route, 4, A) || ![14, 16, 18].some((v) => close(v, a.length))) ok = false;
        });
      }
      return { pass: ok, details: `${total} rotas verificadas (10 formigas × 30 iterações); comprimentos observados: ${[...lens].sort((x, y) => x - y).join('; ')}` };
    });

    test('6.2', 'Probabilidades em A (τ = 1, α = 1, β = 2)', () => {
      const it = ACO.choiceProbabilities(A, [B, C, D], tau1, dist, 1, 2);
      const [b, c, d] = it;
      const sum = it.reduce((s, x) => s + x.p, 0);
      const ok = close(b.w, 1 / 9) && close(c.w, 1 / 25) && close(d.w, 1 / 16) &&
        close(b.p, 400 / 769) && close(c.p, 144 / 769) && close(d.p, 225 / 769) && close(sum, 1);
      return { pass: ok, details: `w(A,B) = ${f6(b.w)}, w(A,C) = ${f6(c.w)}, w(A,D) = ${f6(d.w)}; p(A,B) = ${f6(b.p)}, p(A,C) = ${f6(c.p)}, p(A,D) = ${f6(d.p)}; soma = ${f6(sum)}` };
    });

    test('6.2', 'Após visitar B, só C e D participam do sorteio', () => {
      const seq = [0.1, 0.0];
      let k = 0;
      const res = ACO.constructRoute(A, 4, tau1, dist, 1, 2, () => seq[k++]);
      const s = res.steps[1];
      const ids = s.candidates.map((x) => x.j);
      const pc = s.candidates[0].p, pd = s.candidates[1].p;
      const ok = res.steps[0].chosen === B && s.current === B && ids.length === 2 && ids[0] === C && ids[1] === D && close(pc, 25 / 41) && close(pd, 16 / 41);
      return { pass: ok, details: `candidatos em B: ${ids.map((i) => NAMES[i]).join(', ')}; p(B,C) = ${f6(pc)}, p(B,D) = ${f6(pd)}` };
    });

    test('6.2', 'α = 0 e β = 0: probabilidades iguais (mesmo com τ e d diferentes)', () => {
      const t = ACO.createPheromoneMatrix(4, 1);
      t[0][1] = t[1][0] = 7.3; t[0][2] = t[2][0] = 0.02; t[0][3] = t[3][0] = 2; t[1][2] = t[2][1] = 9;
      const p3 = ACO.choiceProbabilities(A, [B, C, D], t, dist, 0, 0).map((x) => x.p);
      const p2 = ACO.choiceProbabilities(B, [C, D], t, dist, 0, 0).map((x) => x.p);
      const ok = p3.every((p) => close(p, 1 / 3)) && p2.every((p) => close(p, 1 / 2));
      return { pass: ok, details: `em A: ${p3.map(f6).join(', ')}; em B (C, D): ${p2.map(f6).join(', ')}` };
    });

    test('6.2', 'Único candidato restante: probabilidade 1', () => {
      const it = ACO.choiceProbabilities(C, [D], tau1, dist, 1, 2);
      const res = ACO.constructRoute(A, 4, tau1, dist, 1, 2, ACO.createRng(7));
      const last = res.steps[2];
      const ok = close(it[0].p, 1) && last.candidates.length === 1 && close(last.candidates[0].p, 1) && last.r === null;
      return { pass: ok, details: `p(C,D) = ${f6(it[0].p)}; no 3º passo da construção há 1 candidato com p = ${f6(last.candidates[0].p)} (sem sorteio)` };
    });

    test('6.2', 'Sorteio proporcional (roleta), sem escolher sempre o maior peso', () => {
      const it = ACO.choiceProbabilities(A, [B, C, D], tau1, dist, 1, 2);
      const rs5 = [0, 0.52, 0.5202, 0.8, 0.99999];
      const picks = rs5.map((r) => NAMES[ACO.rouletteSelect(it, r).j]);
      const rng = ACO.createRng(123);
      const N = 100000;
      const cnt = { B: 0, C: 0, D: 0 };
      for (let k = 0; k < N; k++) cnt[NAMES[ACO.rouletteSelect(it, rng()).j]]++;
      const freq = { B: cnt.B / N, C: cnt.C / N, D: cnt.D / N };
      const ok = picks.join('') === 'BBCDD' && Math.abs(freq.B - 400 / 769) < 0.01 && Math.abs(freq.C - 144 / 769) < 0.01 && Math.abs(freq.D - 225 / 769) < 0.01;
      return { pass: ok, details: `r = ${rs5.map(br).join(' / ')} → ${picks.join(', ')}; frequências em ${N} sorteios: B ${f6(freq.B)}, C ${f6(freq.C)}, D ${f6(freq.D)}` };
    });

    const ROUTE = [A, B, C, D, A];
    const PER = [[A, B], [B, C], [C, D], [A, D]];
    const DIAG = [[A, C], [B, D]];
    const forced = (over) => new ACO.AntColony(refConfig(Object.assign({ ants: 1, rho: 0.5, tau0: 1, Q: 14 }, over)));
    const all = (col, pairs, v) => pairs.every(([i, j]) => close(col.tau[i][j], v) && close(col.tau[j][i], v));
    const findLog = (rec, i, j) => rec.edgeLog.find((e) => e.i === i && e.j === j);

    test('6.3', 'Uma formiga, rota forçada A → B → C → D → A (1ª iteração)', () => {
      const col = forced();
      const rec = col.step({ forcedRoutes: [ROUTE] });
      const logAB = ACO.formatEdgeLog(findLog(rec, A, B));
      const logAC = ACO.formatEdgeLog(findLog(rec, A, C));
      const ok = close(rec.ants[0].length, 14) && rec.edgeLog.every((e) => close(e.afterEvap, 0.5)) &&
        all(col, PER, 1.5) && all(col, DIAG, 0.5) &&
        logAB === 'anterior 1; após evaporação 0,5; depósito 1; final 1,5' &&
        logAC === 'anterior 1; após evaporação 0,5; depósito 0; final 0,5';
      return { pass: ok, details: `L = 14; após evaporação todas = 0,5; AB = BC = CD = AD = 1,5; AC = BD = 0,5. Log AB: "${logAB}". Log AC: "${logAC}"` };
    });

    test('6.3', 'Segunda iteração com a mesma rota forçada', () => {
      const col = forced();
      col.step({ forcedRoutes: [ROUTE] });
      col.step({ forcedRoutes: [ROUTE] });
      const ok = all(col, PER, 1.75) && all(col, DIAG, 0.25);
      return { pass: ok, details: `perímetro = ${[col.tau[A][B], col.tau[B][C], col.tau[C][D], col.tau[A][D]].map(br).join('; ')}; diagonais = ${br(col.tau[A][C])}; ${br(col.tau[B][D])}` };
    });

    test('6.3', 'Duas formigas na mesma rota (soma dos depósitos)', () => {
      const col = forced({ ants: 2 });
      const rec = col.step({ forcedRoutes: [ROUTE, ROUTE] });
      const ok = all(col, PER, 2.5) && all(col, DIAG, 0.5) && findLog(rec, A, B).ants === 2;
      return { pass: ok, details: `perímetro = ${br(col.tau[A][B])} (depósito total ${br(findLog(rec, A, B).deposit)} de 2 formigas); diagonais = ${br(col.tau[A][C])}` };
    });

    test('6.3', 'Simetria τ(i,j) = τ(j,i) e diagonal sem feromônio', () => {
      const col = new ACO.AntColony(refConfig()).run();
      let ok = true;
      for (let i = 0; i < 4; i++) {
        if (col.tau[i][i] !== 0) ok = false;
        for (let j = 0; j < 4; j++) if (col.tau[i][j] !== col.tau[j][i]) ok = false;
      }
      return { pass: ok, details: 'matriz final da execução da seção 6.4 verificada' };
    });

    test('6.3', 'Piso numérico de 10⁻¹² por aresta', () => {
      const col = forced({ rho: 0.9, tau0: 0.01, Q: 0.01, iterations: 20 });
      let rec;
      for (let k = 0; k < 20; k++) rec = col.step({ forcedRoutes: [ROUTE] });
      const ok = col.tau[A][C] === ACO.PHEROMONE_FLOOR && findLog(rec, A, C).floorApplied;
      return { pass: ok, details: `ρ = 90%, τ₀ = 0,01, 20 iterações: τ(A,C) seria 0,01 × 0,1²⁰ = 1e-22 → mantido em 1e-12` };
    });

    test('6.4', 'Execução completa (10 formigas, 30 iterações, α = 1, β = 2, ρ = 50%, τ₀ = 1, Q = 14, semente 42)', () => {
      const col = new ACO.AntColony(refConfig());
      let init = col.iteration === 0 && col.bestLength === null && col.history.length === 0;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (i !== j && col.tau[i][j] !== 1) init = false;
      col.run();
      const h = col.history;
      let mono = true;
      for (let k = 1; k < h.length; k++) if (h[k].bestLength > h[k - 1].bestLength) mono = false;
      const ok = init && h.length === 30 && h.every((r, k) => r.iteration === k + 1) && mono &&
        [14, 16, 18].some((v) => close(v, col.bestLength)) && ACO.isValidRoute(col.bestRoute, 4, A);
      experiments.run42 = {
        history: h.map((r) => ({ it: r.iteration, min: r.iterBestLength, avg: r.avgLength, best: r.bestLength, route: rs(r.iterBestRoute), tauAB: r.edgeLog.find((e) => e.i === A && e.j === B).final, tauAC: r.edgeLog.find((e) => e.i === A && e.j === C).final })),
        bestRoute: rs(col.bestRoute),
        bestLength: col.bestLength,
        bestIteration: col.bestIteration,
      };
      return { pass: ok, details: `iteração 0: τ = 1 e melhor distância "ainda não calculada"; ${h.length} registros; melhor acumulada nunca aumenta; melhor rota ${rs(col.bestRoute)} = ${br(col.bestLength)} (iteração ${col.bestIteration})` };
    });

    test('6.4', 'Reprodutibilidade com os mesmos dados, parâmetros e semente', () => {
      const s1 = signature(new ACO.AntColony(refConfig()).run());
      const s2 = signature(new ACO.AntColony(refConfig()).run());
      const col = new ACO.AntColony(refConfig()).run();
      col.reset();
      const s3 = signature(col.run());
      return { pass: s1 === s2 && s1 === s3, details: 'duas execuções novas e uma após Reiniciar produziram histórico e feromônios idênticos' };
    });

    test('6.4', 'Pausar e retomar (ou avançar iteração a iteração) preserva o resultado', () => {
      const ref = signature(new ACO.AntColony(refConfig()).run());
      const a = new ACO.AntColony(refConfig());
      for (let k = 0; k < 12; k++) a.step();
      while (!a.finished) a.step();
      const b = new ACO.AntColony(refConfig());
      while (b.step()) { }
      return { pass: signature(a) === ref && signature(b) === ref, details: 'execução pausada na iteração 12 e retomada = execução contínua = execução por "Avançar"' };
    });

    test('6.4', 'Todas as formigas da iteração usam os feromônios da iteração anterior', () => {
      const col = new ACO.AntColony(refConfig());
      let ok = true;
      let checks = 0;
      for (let it = 0; it < 5; it++) {
        const before = col.tau.map((r) => r.slice());
        col.step();
        col.lastAntsSteps.forEach((steps) => steps.forEach((s) => {
          if (s.returnToDepot) return;
          const exp = ACO.choiceProbabilities(s.current, s.candidates.map((c) => c.j), before, dist, 1, 2);
          s.candidates.forEach((c, q) => { checks++; if (!close(c.p, exp[q].p) || c.tau !== before[s.current][c.j]) ok = false; });
        }));
      }
      return { pass: ok, details: `${checks} probabilidades conferidas nas 5 primeiras iterações contra a matriz τ do início de cada iteração` };
    });

    const betaCmp = {};
    [0, 2].forEach((b) => {
      const runs = [1, 2, 3, 4, 5].map((seed) => {
        const col = new ACO.AntColony(refConfig({ beta: b, seed })).run();
        return { seed, best: col.bestLength, route: rs(col.bestRoute), it: col.bestIteration, finalAvg: col.history[29].avgLength };
      });
      const mean = runs.reduce((s, r) => s + r.best, 0) / runs.length;
      const hits = runs.filter((r) => close(r.best, 14)).length;
      const meanFirst = runs.reduce((s, r) => s + r.it, 0) / runs.length;
      const meanFinalAvg = runs.reduce((s, r) => s + r.finalAvg, 0) / runs.length;
      betaCmp[b] = { runs, mean, hits, meanFirst, meanFinalAvg };
    });
    experiments.beta = betaCmp;
    test('6.5', 'Comparação β = 0 × β = 2 (sementes 1 a 5, demais parâmetros da 6.4)', () => {
      const ok = [0, 2].every((b) => betaCmp[b].runs.every((r) => [14, 16, 18].some((v) => close(v, r.best))));
      return { pass: ok, details: `β = 0: média ${br(betaCmp[0].mean)}, ${betaCmp[0].hits}/5 atingiram 14; β = 2: média ${br(betaCmp[2].mean)}, ${betaCmp[2].hits}/5 atingiram 14` };
    });

    test('6.5', 'ρ = 0%: evaporação não reduz o feromônio', () => {
      const f = forced({ rho: 0 });
      f.step({ forcedRoutes: [ROUTE] });
      const col = new ACO.AntColony(refConfig({ rho: 0 }));
      let ok = all(f, PER, 2) && all(f, DIAG, 1);
      while (!col.finished) {
        const rec = col.step();
        rec.edgeLog.forEach((e) => { if (e.afterEvap !== e.before || e.final < e.before) ok = false; });
      }
      return { pass: ok, details: 'rota forçada: perímetro 1 → 2, diagonais permanecem 1; execução completa com ρ = 0: nenhuma aresta diminuiu em 30 iterações' };
    });

    const baseRaw = () => ({
      vertices: [{ id: 'A', x: '0', y: '0' }, { id: 'B', x: '3', y: '0' }, { id: 'C', x: '3', y: '4' }, { id: 'D', x: '0', y: '4' }],
      depotIndex: 0, ants: '10', iterations: '30', alpha: '1', beta: '2', rhoPercent: '50', tau0: '1', Q: '14', seed: '42',
    });
    const cases = [
      ['Configuração válida (controle)', () => {}, true],
      ['Coordenadas duplicadas', (r) => { r.vertices[1].x = '0'; r.vertices[1].y = '0'; }],
      ['Identificador repetido', (r) => { r.vertices[1].id = 'A'; }],
      ['Menos de quatro vértices', (r) => { r.vertices.pop(); }],
      ['Mais de doze vértices', (r) => { for (let k = 0; k < 9; k++) r.vertices.push({ id: 'V' + k, x: String(10 + k), y: '10' }); }],
      ['Identificador vazio', (r) => { r.vertices[2].id = ' '; }],
      ['Coordenada vazia', (r) => { r.vertices[2].x = ''; }],
      ['Número de formigas vazio', (r) => { r.ants = ''; }],
      ['Formigas = 0', (r) => { r.ants = '0'; }],
      ['Formigas = 101', (r) => { r.ants = '101'; }],
      ['Formigas não inteiro (2.5)', (r) => { r.ants = '2.5'; }],
      ['Iterações = 0', (r) => { r.iterations = '0'; }],
      ['Iterações = 201', (r) => { r.iterations = '201'; }],
      ['α = 5,1', (r) => { r.alpha = '5,1'; }],
      ['β = −1', (r) => { r.beta = '-1'; }],
      ['ρ = 91%', (r) => { r.rhoPercent = '91'; }],
      ['τ₀ = 0', (r) => { r.tau0 = '0'; }],
      ['τ₀ = 100,5', (r) => { r.tau0 = '100.5'; }],
      ['Q = 0', (r) => { r.Q = '0'; }],
      ['Q = 10000,01', (r) => { r.Q = '10000.01'; }],
      ['x = 1000,01', (r) => { r.vertices[1].x = '1000.01'; }],
      ['y = −0,5', (r) => { r.vertices[1].y = '-0.5'; }],
      ['x com três casas decimais (1.234)', (r) => { r.vertices[1].x = '1.234'; }],
      ['x não numérico (abc)', (r) => { r.vertices[1].x = 'abc'; }],
      ['Semente não inteira (4.2)', (r) => { r.seed = '4.2'; }],
      ['Semente vazia', (r) => { r.seed = ''; }],
      ['Depósito inexistente', (r) => { r.depotIndex = 9; }],
    ];
    cases.forEach(([name, mutate, shouldPass]) => {
      test('6.5', `Entrada: ${name}`, () => {
        const raw = baseRaw();
        mutate(raw);
        const res = ACO.validateConfig(raw);
        const ok = shouldPass ? res.ok : (!res.ok && res.errors.length > 0 && res.errors.every((e) => e.message.length > 10));
        return { pass: ok, details: res.ok ? 'aceita' : 'bloqueada: ' + res.errors.map((e) => e.message).join(' | ') };
      });
    });

    return { results, experiments, passed: results.filter((r) => r.pass).length, total: results.length };
  }

  return { runAll };
});
