(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./rng.js'));
  else root.ACO = factory(root.SeededRNG);
})(typeof self !== 'undefined' ? self : this, function (RNG) {
  'use strict';

  const PHEROMONE_FLOOR = 1e-12;

  function euclidean(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function buildDistanceMatrix(vertices) {
    const n = vertices.length;
    const d = [];
    for (let i = 0; i < n; i++) {
      d.push(new Array(n).fill(0));
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const v = euclidean(vertices[i], vertices[j]);
        d[i][j] = v;
        d[j][i] = v;
      }
    }
    return d;
  }

  function createPheromoneMatrix(n, tau0) {
    const t = [];
    for (let i = 0; i < n; i++) {
      const row = new Array(n).fill(tau0);
      row[i] = 0;
      t.push(row);
    }
    return t;
  }

  function routeLength(route, dist) {
    let L = 0;
    for (let k = 0; k < route.length - 1; k++) L += dist[route[k]][route[k + 1]];
    return L;
  }

  function isValidRoute(route, n, depot) {
    if (!Array.isArray(route) || route.length !== n + 1) return false;
    if (route[0] !== depot || route[n] !== depot) return false;
    const seen = new Set([depot]);
    for (let k = 1; k < n; k++) {
      const v = route[k];
      if (!Number.isInteger(v) || v < 0 || v >= n || seen.has(v)) return false;
      seen.add(v);
    }
    return seen.size === n;
  }

  function choiceProbabilities(current, candidates, tau, dist, alpha, beta) {
    const items = candidates.map((j) => {
      const t = tau[current][j];
      const d = dist[current][j];
      const w = Math.pow(t, alpha) * Math.pow(1 / d, beta);
      const logw = alpha * Math.log(t) - beta * Math.log(d);
      return { j, tau: t, dist: d, w, logw, p: 0 };
    });
    const sum = items.reduce((s, it) => s + it.w, 0);
    // se w estourar (α ou β altos), calcula p em escala logarítmica
    const directOk = Number.isFinite(sum) && sum > 0 && items.every((it) => Number.isFinite(it.w));
    if (directOk) {
      items.forEach((it) => { it.p = it.w / sum; });
    } else {
      const max = Math.max(...items.map((it) => it.logw));
      const e = items.map((it) => Math.exp(it.logw - max));
      const s = e.reduce((a, b) => a + b, 0);
      items.forEach((it, k) => { it.p = e[k] / s; });
    }
    items.forEach((it) => { delete it.logw; });
    return items;
  }

  function rouletteSelect(items, r) {
    let cum = 0;
    for (let k = 0; k < items.length; k++) {
      cum += items[k].p;
      if (r < cum) return items[k];
    }
    for (let k = items.length - 1; k >= 0; k--) if (items[k].p > 0) return items[k];
    return items[items.length - 1];
  }

  function constructRoute(depot, n, tau, dist, alpha, beta, rng) {
    const route = [depot];
    const visited = new Array(n).fill(false);
    visited[depot] = true;
    let current = depot;
    const steps = [];

    for (let k = 1; k < n; k++) {
      const candidates = [];
      for (let j = 0; j < n; j++) if (!visited[j]) candidates.push(j);
      const items = choiceProbabilities(current, candidates, tau, dist, alpha, beta);
      let chosen;
      let r = null;
      if (items.length === 1) {
        chosen = items[0].j;
      } else {
        r = rng();
        chosen = rouletteSelect(items, r).j;
      }
      steps.push({ current, candidates: items, r, chosen });
      visited[chosen] = true;
      route.push(chosen);
      current = chosen;
    }
    route.push(depot);
    steps.push({ current, returnToDepot: true, chosen: depot });

    return { route, length: routeLength(route, dist), steps };
  }

  function updatePheromones(tau, antResults, rho, Q) {
    const n = tau.length;
    const deposit = [];
    const count = [];
    for (let i = 0; i < n; i++) {
      deposit.push(new Array(n).fill(0));
      count.push(new Array(n).fill(0));
    }

    antResults.forEach((ant) => {
      const used = new Set(); // cada formiga deposita uma vez por aresta
      const dep = Q / ant.length;
      for (let k = 0; k < ant.route.length - 1; k++) {
        const a = ant.route[k];
        const b = ant.route[k + 1];
        const i = Math.min(a, b);
        const j = Math.max(a, b);
        const key = i * n + j;
        if (used.has(key)) continue;
        used.add(key);
        deposit[i][j] += dep;
        count[i][j] += 1;
      }
    });

    const newTau = createPheromoneMatrix(n, 0);
    const edgeLog = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const before = tau[i][j];
        const afterEvap = (1 - rho) * before;
        const dep = deposit[i][j];
        const raw = afterEvap + dep;
        const final = Math.max(raw, PHEROMONE_FLOOR);
        newTau[i][j] = final;
        newTau[j][i] = final;
        edgeLog.push({ i, j, before, afterEvap, deposit: dep, ants: count[i][j], final, floorApplied: raw < PHEROMONE_FLOOR });
      }
    }
    return { tau: newTau, edgeLog };
  }

  class AntColony {
    constructor(config) {
      this.config = config;
      this.n = config.vertices.length;
      this.dist = buildDistanceMatrix(config.vertices);
      this.reset();
    }

    reset() {
      this.rng = RNG.createRng(this.config.seed);
      this.tau = createPheromoneMatrix(this.n, this.config.tau0);
      this.iteration = 0;
      this.history = [];
      this.bestRoute = null;
      this.bestLength = null;
      this.bestIteration = null;
      this.lastAntsSteps = [];
    }

    get finished() {
      return this.iteration >= this.config.iterations;
    }

    step(options) {
      if (this.finished) return null;
      const c = this.config;
      const ants = [];

      if (options && options.forcedRoutes) {
        options.forcedRoutes.forEach((route) => {
          if (!isValidRoute(route, this.n, c.depot)) throw new Error('Rota forçada inválida: ' + route.join(','));
          ants.push({ route: route.slice(), length: routeLength(route, this.dist), steps: null });
        });
      } else {
        // todas as formigas usam o mesmo this.tau, que só muda depois do laço
        for (let k = 0; k < c.ants; k++) {
          ants.push(constructRoute(c.depot, this.n, this.tau, this.dist, c.alpha, c.beta, this.rng));
        }
      }

      let bestIdx = 0;
      let sum = 0;
      ants.forEach((a, k) => {
        sum += a.length;
        if (a.length < ants[bestIdx].length) bestIdx = k;
      });
      const iterBest = ants[bestIdx];

      const upd = updatePheromones(this.tau, ants, c.rho, c.Q);
      this.tau = upd.tau;
      this.iteration += 1;

      let improved = false;
      if (this.bestLength === null || iterBest.length < this.bestLength) {
        this.bestLength = iterBest.length;
        this.bestRoute = iterBest.route.slice();
        this.bestIteration = this.iteration;
        improved = true;
      }

      let maxTau = 0;
      let minTau = Infinity;
      upd.edgeLog.forEach((e) => {
        if (e.final > maxTau) maxTau = e.final;
        if (e.final < minTau) minTau = e.final;
      });

      const record = {
        iteration: this.iteration,
        ants: ants.map((a) => ({ route: a.route, length: a.length })),
        bestAntIndex: bestIdx,
        iterBestLength: iterBest.length,
        iterBestRoute: iterBest.route.slice(),
        avgLength: sum / ants.length,
        bestLength: this.bestLength,
        bestRoute: this.bestRoute.slice(),
        improved,
        ant1Steps: ants[0].steps,
        edgeLog: upd.edgeLog,
        maxTau,
        minTau,
      };
      this.history.push(record);
      this.lastAntsSteps = ants.map((a) => a.steps);
      return record;
    }

    run() {
      while (!this.finished) this.step();
      return this;
    }
  }

  function fmtBR(x) {
    if (x !== 0 && Math.abs(x) < 1e-4) return x.toExponential(3).replace('.', ',');
    return String(Number(x.toFixed(6))).replace('.', ',');
  }

  function formatEdgeLog(e) {
    return `anterior ${fmtBR(e.before)}; após evaporação ${fmtBR(e.afterEvap)}; depósito ${fmtBR(e.deposit)}; final ${fmtBR(e.final)}`;
  }

  const NUM_RE = /^[+-]?\d+([.,]\d+)?$/;
  const INT_RE = /^[+-]?\d+$/;

  function parseNumber(raw, label, min, max, opts) {
    const o = opts || {};
    const s = String(raw === undefined || raw === null ? '' : raw).trim();
    if (s === '') return { error: `${label}: campo vazio.` };
    if (o.integer) {
      if (!INT_RE.test(s)) return { error: `${label}: informe um número inteiro.` };
    } else if (!NUM_RE.test(s)) {
      return { error: `${label}: "${s}" não é um número válido.` };
    }
    const v = Number(s.replace(',', '.'));
    if (!Number.isFinite(v)) return { error: `${label}: informe um número finito.` };
    if (v < min || v > max) return { error: `${label}: deve estar entre ${o.minText || min} e ${o.maxText || max} (recebido ${s}).` };
    if (o.maxDecimals !== undefined) {
      const dec = (s.split(/[.,]/)[1] || '').length;
      if (dec > o.maxDecimals) return { error: `${label}: use no máximo ${o.maxDecimals} casas decimais (recebido ${s}).` };
    }
    return { value: v };
  }

  function validateConfig(raw) {
    const errors = [];
    const err = (field, message) => errors.push({ field, message });
    const vs = raw.vertices || [];

    if (vs.length < 4) err('vertices', `São necessários pelo menos 4 vértices (há ${vs.length}).`);
    if (vs.length > 12) err('vertices', `São permitidos no máximo 12 vértices (há ${vs.length}).`);

    const ids = new Map();
    const coords = new Map();
    const parsed = [];
    vs.forEach((v, k) => {
      const id = String(v.id === undefined || v.id === null ? '' : v.id).trim();
      const name = id ? `Vértice ${id}` : `Vértice da linha ${k + 1}`;
      if (!id) err(`v${k}-id`, `Linha ${k + 1}: o identificador do vértice está vazio.`);
      else if (ids.has(id)) err(`v${k}-id`, `Identificador "${id}" repetido (linhas ${ids.get(id) + 1} e ${k + 1}).`);
      else ids.set(id, k);

      const x = parseNumber(v.x, `${name}, coordenada x`, 0, 1000, { maxDecimals: 2, maxText: '1.000' });
      const y = parseNumber(v.y, `${name}, coordenada y`, 0, 1000, { maxDecimals: 2, maxText: '1.000' });
      if (x.error) err(`v${k}-x`, x.error);
      if (y.error) err(`v${k}-y`, y.error);
      if (!x.error && !y.error) {
        const key = `${x.value}|${y.value}`;
        if (coords.has(key)) {
          err(`v${k}-x`, `${name} tem as mesmas coordenadas (${x.value}; ${y.value}) da linha ${coords.get(key) + 1}; isso produziria distância zero.`);
        } else coords.set(key, k);
      }
      parsed.push({ id, x: x.value, y: y.value });
    });

    const di = raw.depotIndex;
    if (!Number.isInteger(di) || di < 0 || di >= vs.length) err('depot', 'Selecione um depósito entre os vértices cadastrados.');

    const num = (key, label, min, max, opts) => {
      const r = parseNumber(raw[key], label, min, max, opts);
      if (r.error) err(key, r.error);
      return r.value;
    };
    const ants = num('ants', 'Número de formigas', 1, 100, { integer: true });
    const iterations = num('iterations', 'Número de iterações', 1, 200, { integer: true });
    const alpha = num('alpha', 'Influência do feromônio (α)', 0, 5);
    const beta = num('beta', 'Influência da distância (β)', 0, 5);
    const rhoPercent = num('rhoPercent', 'Taxa de evaporação (ρ)', 0, 90, { minText: '0%', maxText: '90%' });
    const tau0 = num('tau0', 'Feromônio inicial (τ₀)', 0.01, 100, { minText: '0,01' });
    const Q = num('Q', 'Constante de depósito (Q)', 0.01, 10000, { minText: '0,01', maxText: '10.000' });
    const seed = num('seed', 'Semente aleatória', 0, 4294967295, { integer: true, maxText: '4.294.967.295' });

    if (errors.length) return { ok: false, errors, config: null };
    return {
      ok: true,
      errors: [],
      config: { vertices: parsed, depot: di, ants, iterations, alpha, beta, rho: rhoPercent / 100, rhoPercent, tau0, Q, seed },
    };
  }

  return {
    PHEROMONE_FLOOR,
    createRng: RNG.createRng,
    euclidean,
    buildDistanceMatrix,
    createPheromoneMatrix,
    routeLength,
    isValidRoute,
    choiceProbabilities,
    rouletteSelect,
    constructRoute,
    updatePheromones,
    AntColony,
    validateConfig,
    formatEdgeLog,
    fmtBR,
  };
});
