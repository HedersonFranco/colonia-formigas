(function () {
  'use strict';

  const ACO = window.ACO;
  const $ = (s) => document.querySelector(s);

  const nf6 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 });
  function fmt(x, digits) {
    if (x === null || x === undefined || Number.isNaN(x)) return '—';
    if (x !== 0 && Math.abs(x) < 1e-4) return x.toExponential(3).replace('.', ',');
    if (digits !== undefined) return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(x);
    return nf6.format(x);
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const SCENARIO = [
    { id: 'A', x: '500', y: '500' }, { id: 'B', x: '150', y: '800' }, { id: 'C', x: '820', y: '760' },
    { id: 'D', x: '900', y: '300' }, { id: 'E', x: '300', y: '150' }, { id: 'F', x: '650', y: '120' },
    { id: 'G', x: '100', y: '420' }, { id: 'H', x: '420', y: '880' },
  ];
  const SCENARIO_PARAMS = { ants: '10', iterations: '50', alpha: '1', beta: '2', rhoPercent: '50', tau0: '1', Q: '1000', seed: '42' };
  const REFERENCE = [{ id: 'A', x: '0', y: '0' }, { id: 'B', x: '3', y: '0' }, { id: 'C', x: '3', y: '4' }, { id: 'D', x: '0', y: '4' }];
  const REFERENCE_PARAMS = { ants: '10', iterations: '30', alpha: '1', beta: '2', rhoPercent: '50', tau0: '1', Q: '14', seed: '42' };
  const PARAM_KEYS = Object.keys(SCENARIO_PARAMS);

  const state = {
    vertices: [],
    depotIndex: 0,
    colony: null,
    dirty: false,
    running: false,
    timer: null,
    selectedEdge: null,
    scaleRef: 1,
    scaleChangedAt: 0,
    logIter: 0,
    logAnt: 0,
  };

  function readRaw() {
    const raw = { vertices: state.vertices.map((v) => ({ ...v })), depotIndex: state.depotIndex };
    PARAM_KEYS.forEach((k) => { raw[k] = $('#p-' + k).value; });
    return raw;
  }

  function loadPreset(vertices, params) {
    state.vertices = vertices.map((v) => ({ ...v }));
    state.depotIndex = 0;
    PARAM_KEYS.forEach((k) => { $('#p-' + k).value = params[k]; });
    renderVertexTable();
    applyConfig();
  }

  function renderVertexTable() {
    const n = state.vertices.length;
    $('#vertex-body').innerHTML = state.vertices.map((v, k) => `
      <tr>
        <td><input id="v${k}-id" data-k="${k}" data-f="id" value="${esc(v.id)}" maxlength="12" autocomplete="off" aria-label="Identificador do vértice ${k + 1}"></td>
        <td><input id="v${k}-x" data-k="${k}" data-f="x" value="${esc(v.x)}" inputmode="decimal" autocomplete="off" aria-label="Coordenada x do vértice ${k + 1}"></td>
        <td><input id="v${k}-y" data-k="${k}" data-f="y" value="${esc(v.y)}" inputmode="decimal" autocomplete="off" aria-label="Coordenada y do vértice ${k + 1}"></td>
        <td><button type="button" class="icon-btn" data-remove="${k}" ${n <= 4 ? 'disabled' : ''} aria-label="Remover vértice ${esc(v.id || k + 1)}" title="Remover">×</button></td>
      </tr>`).join('');
    $('#btn-add').disabled = n >= 12;
    $('#vcount').textContent = `${n} de 12`;
    renderDepotSelect();
  }

  function renderDepotSelect() {
    const sel = $('#depot');
    sel.innerHTML = state.vertices.map((v, k) => `<option value="${k}">${esc(String(v.id).trim() || `(linha ${k + 1})`)}</option>`).join('');
    sel.value = String(state.depotIndex);
  }

  function nextId() {
    const used = new Set(state.vertices.map((v) => String(v.id).trim()));
    for (let c = 65; c <= 90; c++) {
      const id = String.fromCharCode(c);
      if (!used.has(id)) return id;
    }
    let k = 1;
    while (used.has('V' + k)) k++;
    return 'V' + k;
  }

  function freeSpot() {
    const nums = state.vertices.map((v) => [Number(String(v.x).replace(',', '.')), Number(String(v.y).replace(',', '.'))]);
    const finite = nums.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
    const maxC = finite.length ? Math.max(...finite.flat()) : 1000;
    const span = maxC <= 10 ? 10 : 1000;
    for (let t = 1; t < 500; t++) {
      const x = Math.round(((t * 0.618034) % 1) * span * 100) / 100;
      const y = Math.round(((t * 0.754878) % 1) * span * 100) / 100;
      if (!finite.some(([a, b]) => a === x && b === y)) return [x, y];
    }
    return [0, 0];
  }

  function showErrors(errors) {
    document.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
    const box = $('#errors');
    if (!errors.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = '<strong>Corrija antes de executar:</strong><ul>' + errors.map((e) => `<li>${esc(e.message)}</li>`).join('') + '</ul>';
    errors.forEach((e) => {
      let el = null;
      if (/^v\d+-(id|x|y)$/.test(e.field)) el = document.getElementById(e.field);
      else if (e.field === 'depot') el = $('#depot');
      else if (e.field === 'vertices') el = $('#vertex-table');
      else el = document.getElementById('p-' + e.field);
      if (el) el.classList.add('invalid');
    });
  }

  function markDirty() {
    state.dirty = true;
    const res = ACO.validateConfig(readRaw());
    showErrors(res.errors);
    renderAll();
  }

  function applyConfig() {
    pause();
    const res = ACO.validateConfig(readRaw());
    showErrors(res.errors);
    if (!res.ok) {
      state.colony = null;
      state.dirty = true;
      renderAll();
      return false;
    }
    state.colony = new ACO.AntColony(res.config);
    state.dirty = false;
    state.scaleRef = niceCeil(res.config.tau0);
    state.scaleChangedAt = 0;
    state.logIter = 0;
    state.logAnt = 0;
    if (state.selectedEdge && (state.selectedEdge[0] >= state.colony.n || state.selectedEdge[1] >= state.colony.n)) state.selectedEdge = null;
    renderAll();
    return true;
  }

  function niceCeil(x) {
    const e = Math.pow(10, Math.floor(Math.log10(x)));
    for (const m of [1, 2, 5, 10]) if (m * e >= x * (1 - 1e-12)) return m * e;
    return 10 * e;
  }

  const canStep = () => !!state.colony && !state.dirty && !state.colony.finished;

  function doStep() {
    const rec = state.colony.step();
    if (!rec) return;
    if (rec.maxTau > state.scaleRef) {
      state.scaleRef = niceCeil(rec.maxTau);
      state.scaleChangedAt = rec.iteration;
    }
    renderAll();
  }

  function tick() {
    if (!state.running) return;
    doStep();
    if (!canStep()) { pause(); return; }
    state.timer = setTimeout(tick, Number($('#speed').value));
  }

  function run() {
    if (!canStep() || state.running) return;
    state.running = true;
    renderControls();
    tick();
  }

  function pause() {
    state.running = false;
    clearTimeout(state.timer);
    state.timer = null;
    renderControls();
  }

  function stepOnce() {
    pause();
    if (canStep()) doStep();
  }

  function renderAll() {
    renderControls();
    renderMetrics();
    renderGraph();
    renderEdgePanel();
    renderChart();
    renderHistory();
    renderLogs();
  }

  function renderControls() {
    const c = state.colony;
    $('#btn-run').disabled = state.running || !canStep();
    $('#btn-pause').disabled = !state.running;
    $('#btn-step').disabled = !canStep();
    $('#config-fieldset').disabled = state.running;
    $('#dirty').hidden = !state.dirty;
    let s;
    if (state.running) s = `Executando… iteração ${c.iteration} de ${c.config.iterations}.`;
    else if (state.dirty) s = 'Alterações pendentes: Executar e Avançar ficam bloqueados até Reiniciar com dados válidos.';
    else if (!c) s = 'Configuração inválida.';
    else if (c.finished) s = `Execução concluída: ${c.config.iterations} iterações. Use Reiniciar para executar de novo.`;
    else if (c.iteration === 0) s = 'Pronto. Iteração 0: τ = τ₀ em todas as arestas, nenhuma rota calculada.';
    else s = `Pausado na iteração ${c.iteration} de ${c.config.iterations}.`;
    $('#status').textContent = s;
  }

  function vid(i) {
    const c = state.colony;
    return c ? c.config.vertices[i].id : String(i);
  }
  function routeStr(route) { return route.map(vid).join(' → '); }

  function renderMetrics() {
    const c = state.colony;
    const box = $('#metrics');
    if (!c || state.dirty) {
      box.innerHTML = '<div class="metric wide"><span>Situação</span><b>Aguardando Reiniciar com dados válidos</b></div>';
      return;
    }
    const last = c.history[c.history.length - 1];
    const notYet = 'ainda não calculada';
    box.innerHTML = `
      <div class="metric"><span>Iteração atual</span><b>${c.iteration} <small>de ${c.config.iterations}</small></b></div>
      <div class="metric"><span>Menor distância da iteração</span><b>${last ? fmt(last.iterBestLength, 4) : notYet}</b></div>
      <div class="metric"><span>Média das formigas</span><b>${last ? fmt(last.avgLength, 4) : notYet}</b></div>
      <div class="metric best"><span>Melhor distância acumulada</span><b>${c.bestLength === null ? notYet : fmt(c.bestLength, 4)}</b></div>
      <div class="metric wide"><span>Melhor rota acumulada${c.bestIteration ? ` (encontrada na iteração ${c.bestIteration})` : ''}</span>
        <b class="route">${c.bestRoute ? esc(routeStr(c.bestRoute)) : 'ainda não calculada'}</b></div>`;
  }

  function graphData() {
    const c = state.colony;
    if (c && !state.dirty) {
      return { verts: c.config.vertices.map((v, i) => ({ ...v, idx: i })), depot: c.config.depot, tau: c.tau, best: c.bestRoute, preview: false };
    }
    const verts = [];
    state.vertices.forEach((v, i) => {
      const sx = String(v.x).trim().replace(',', '.');
      const sy = String(v.y).trim().replace(',', '.');
      const x = Number(sx), y = Number(sy);
      if (sx !== '' && sy !== '' && Number.isFinite(x) && Number.isFinite(y)) verts.push({ id: String(v.id).trim() || '?', x, y, idx: i });
    });
    return { verts, depot: state.depotIndex, tau: null, best: null, preview: true };
  }

  function renderGraph() {
    const W = 640, H = 500, P = 50;
    const g = graphData();
    const svg = $('#graph');
    const mode = $('#graph-mode');
    mode.hidden = !g.preview;
    mode.textContent = g.preview ? 'Pré-visualização dos dados editados: o feromônio aparece depois de Reiniciar.' : '';
    if (!g.verts.length) {
      svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" class="empty">Nenhum vértice com coordenadas válidas</text>`;
      return;
    }
    const xs = g.verts.map((v) => v.x), ys = g.verts.map((v) => v.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const dx = maxX - minX, dy = maxY - minY;
    const s = Math.min(dx > 0 ? (W - 2 * P) / dx : Infinity, dy > 0 ? (H - 2 * P) / dy : Infinity);
    const sc = Number.isFinite(s) ? s : 1;
    const offX = (W - 2 * P - dx * sc) / 2, offY = (H - 2 * P - dy * sc) / 2;
    const pos = {};
    g.verts.forEach((v) => {
      pos[v.idx] = { X: P + offX + (v.x - minX) * sc, Y: H - (P + offY + (v.y - minY) * sc) };
    });

    const ref = state.scaleRef || 1;
    const showLabels = $('#show-labels').checked;
    const sel = state.selectedEdge;
    const edges = [];
    for (let a = 0; a < g.verts.length; a++) {
      for (let b = a + 1; b < g.verts.length; b++) {
        const i = g.verts[a].idx, j = g.verts[b].idx;
        edges.push({ i, j, t: g.tau ? g.tau[i][j] : null });
      }
    }
    edges.sort((e1, e2) => (e1.t || 0) - (e2.t || 0));

    let html = `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="arrow-head"/></marker></defs>`;
    let lines = '', hits = '', labels = '';
    edges.forEach((e) => {
      const p1 = pos[e.i], p2 = pos[e.j];
      const r = e.t === null ? 0 : Math.min(e.t / ref, 1);
      const w = e.t === null ? 1 : 0.6 + 7.4 * r;
      const op = e.t === null ? 0.35 : 0.12 + 0.88 * r;
      const isSel = sel && sel[0] === e.i && sel[1] === e.j;
      lines += `<line class="edge${isSel ? ' selected' : ''}${e.t === null ? ' preview' : ''}" x1="${p1.X}" y1="${p1.Y}" x2="${p2.X}" y2="${p2.Y}" stroke-width="${w.toFixed(2)}" stroke-opacity="${op.toFixed(3)}"/>`;
      if (!g.preview) {
        hits += `<line class="hit" data-i="${e.i}" data-j="${e.j}" x1="${p1.X}" y1="${p1.Y}" x2="${p2.X}" y2="${p2.Y}"/>`;
        if (showLabels) {
          const mx = (p1.X + p2.X) / 2, my = (p1.Y + p2.Y) / 2;
          labels += `<text class="tau-label" x="${mx}" y="${my}" text-anchor="middle" dominant-baseline="middle">${fmt(e.t, 3)}</text>`;
        }
      }
    });
    html += `<g>${lines}</g>`;

    if (g.best) {
      let segs = '';
      for (let k = 0; k < g.best.length - 1; k++) {
        const p1 = pos[g.best[k]], p2 = pos[g.best[k + 1]];
        const len = Math.hypot(p2.X - p1.X, p2.Y - p1.Y) || 1;
        const sh = Math.min(20, len / 2.2);
        const ux = (p2.X - p1.X) / len, uy = (p2.Y - p1.Y) / len;
        segs += `<line class="best" x1="${p1.X + ux * sh}" y1="${p1.Y + uy * sh}" x2="${p2.X - ux * sh}" y2="${p2.Y - uy * sh}" marker-end="url(#arrow)"/>`;
      }
      html += `<g>${segs}</g>`;
    }
    html += `<g>${labels}</g><g>${hits}</g>`;

    let nodes = '';
    g.verts.forEach((v) => {
      const p = pos[v.idx];
      const isDepot = v.idx === g.depot;
      const title = `<title>${esc(v.id)}${isDepot ? ' (depósito)' : ''}: x = ${fmt(v.x)}, y = ${fmt(v.y)}</title>`;
      if (isDepot) {
        nodes += `<g class="node depot">${title}<rect x="${p.X - 16}" y="${p.Y - 16}" width="32" height="32" rx="4"/><text x="${p.X}" y="${p.Y}" text-anchor="middle" dominant-baseline="central">${esc(v.id)}</text><text class="node-tag" x="${p.X}" y="${p.Y + 30}" text-anchor="middle">depósito</text></g>`;
      } else {
        nodes += `<g class="node">${title}<circle cx="${p.X}" cy="${p.Y}" r="15"/><text x="${p.X}" y="${p.Y}" text-anchor="middle" dominant-baseline="central">${esc(v.id)}</text></g>`;
      }
    });
    html += `<g>${nodes}</g>`;
    svg.innerHTML = html;

    const c = state.colony;
    const si = $('#scale-info');
    if (g.preview || !c) { si.textContent = ''; si.className = 'scale-info'; return; }
    let txt = `Escala: espessura e cor máximas correspondem a τ = ${fmt(ref, 4)}. A referência só aumenta (degraus 1, 2, 5, 10…) quando algum τ a ultrapassa; nunca diminui, por isso uma aresta só fica mais grossa se o seu τ aumentou.`;
    if (state.scaleChangedAt > 0 && state.scaleChangedAt === c.iteration) {
      si.className = 'scale-info changed';
      txt = `A escala mudou nesta iteração (${c.iteration}): agora o máximo corresponde a τ = ${fmt(ref, 4)}. Arestas podem parecer mais finas sem que o feromônio delas tenha diminuído; consulte o valor numérico. ` + txt;
    } else {
      si.className = 'scale-info';
      if (state.scaleChangedAt > 0) txt += ` Última mudança de escala: iteração ${state.scaleChangedAt}.`;
    }
    si.textContent = txt;
  }

  function edgeData(i, j) {
    const c = state.colony;
    const d = c.dist[i][j];
    const t = c.tau[i][j];
    const w = Math.pow(t, c.config.alpha) * Math.pow(1 / d, c.config.beta);
    const last = c.history[c.history.length - 1];
    const a = Math.min(i, j), b = Math.max(i, j);
    const log = last ? last.edgeLog.find((e) => e.i === a && e.j === b) : null;
    return { d, t, w, log };
  }

  function edgeHtml(i, j) {
    const c = state.colony;
    const e = edgeData(i, j);
    let h = `<b>Aresta ${esc(vid(i))}–${esc(vid(j))}</b><br>Distância d = ${fmt(e.d)} (fixa)<br>Feromônio τ = ${fmt(e.t)}<br>Peso w = τ^${fmt(c.config.alpha)}·(1/d)^${fmt(c.config.beta)} = ${fmt(e.w)}`;
    if (e.log) h += `<br><span class="muted">Última atualização (iteração ${c.iteration}): ${esc(ACO.formatEdgeLog(e.log))}</span>`;
    else h += `<br><span class="muted">Iteração 0: τ = τ₀, sem atualização.</span>`;
    return h;
  }

  function renderEdgePanel() {
    const c = state.colony;
    const sel = $('#edge-select');
    const info = $('#edge-info');
    if (!c || state.dirty) {
      sel.innerHTML = '<option value="">—</option>';
      sel.disabled = true;
      info.innerHTML = '<p class="muted">Disponível depois de Reiniciar com dados válidos.</p>';
      return;
    }
    sel.disabled = false;
    let opts = '<option value="">Selecione…</option>';
    for (let i = 0; i < c.n; i++) for (let j = i + 1; j < c.n; j++) opts += `<option value="${i}-${j}">${esc(vid(i))}–${esc(vid(j))}</option>`;
    sel.innerHTML = opts;
    if (state.selectedEdge) {
      sel.value = state.selectedEdge.join('-');
      info.innerHTML = edgeHtml(state.selectedEdge[0], state.selectedEdge[1]);
    } else {
      info.innerHTML = '<p class="muted">Nenhuma aresta selecionada.</p>';
    }
  }

  function renderChart() {
    const svg = $('#chart');
    const c = state.colony;
    const W = 640, H = 240, L = 58, R = 16, T = 14, B = 34;
    if (!c || state.dirty || !c.history.length) {
      svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" class="empty">Sem iterações concluídas. A melhor distância ainda não foi calculada.</text>`;
      return;
    }
    const h = c.history;
    const keys = [['iterBestLength', 's-min'], ['avgLength', 's-avg'], ['bestLength', 's-best']];
    const all = h.flatMap((r) => keys.map(([k]) => r[k]));
    let ymin = Math.min(...all), ymax = Math.max(...all);
    if (ymax - ymin < 1e-9) { ymin -= 1; ymax += 1; }
    const pad = (ymax - ymin) * 0.08;
    ymin -= pad; ymax += pad;
    const n = h.length;
    const total = c.config.iterations;
    const xOf = (it) => L + (total > 1 ? (it - 1) / (total - 1) : 0.5) * (W - L - R);
    const yOf = (v) => T + (1 - (v - ymin) / (ymax - ymin)) * (H - T - B);
    let out = '';
    for (let k = 0; k <= 4; k++) {
      const v = ymin + (k / 4) * (ymax - ymin);
      const y = yOf(v);
      out += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text class="axis" x="${L - 6}" y="${y}" text-anchor="end" dominant-baseline="middle">${fmt(v, 2)}</text>`;
    }
    const ticks = [...new Set([1, Math.max(1, Math.round(total / 2)), total])];
    ticks.forEach((t) => { out += `<text class="axis" x="${xOf(t)}" y="${H - 12}" text-anchor="middle">${t}</text>`; });
    out += `<text class="axis" x="${W - R}" y="${H - 1}" text-anchor="end">iteração</text>`;
    keys.forEach(([k, cls]) => {
      if (n === 1) {
        out += `<circle class="${cls}" cx="${xOf(1)}" cy="${yOf(h[0][k])}" r="3.5"/>`;
      } else {
        out += `<polyline class="${cls}" points="${h.map((r) => `${xOf(r.iteration).toFixed(1)},${yOf(r[k]).toFixed(1)}`).join(' ')}"/>`;
      }
    });
    svg.innerHTML = out;
  }

  function renderHistory() {
    const body = $('#history-body');
    const c = state.colony;
    if (!c || state.dirty) { body.innerHTML = ''; return; }
    let rows = `<tr><td>0</td><td>—</td><td>—</td><td>ainda não calculada</td><td>τ = ${fmt(c.config.tau0)} em todas as arestas</td></tr>`;
    c.history.forEach((r) => {
      rows += `<tr${r.improved ? ' class="improved"' : ''}><td>${r.iteration}</td><td>${fmt(r.iterBestLength, 4)}</td><td>${fmt(r.avgLength, 4)}</td><td>${fmt(r.bestLength, 4)}</td><td>${esc(routeStr(r.iterBestRoute))}</td></tr>`;
    });
    body.innerHTML = rows;
  }

  function renderLogs() {
    const c = state.colony;
    const iterSel = $('#log-iter'), antSel = $('#log-ant');
    const boxC = $('#log-construct'), boxR = $('#log-routes'), boxP = $('#log-pher');
    if (!c || state.dirty || !c.history.length) {
      iterSel.innerHTML = '<option>—</option>'; iterSel.disabled = true;
      antSel.innerHTML = '<option>—</option>'; antSel.disabled = true;
      const msg = c && !state.dirty ? `<p class="muted">Iteração 0: τ = ${fmt(c.config.tau0)} em todas as arestas e nenhuma rota construída.</p>` : '<p class="muted">Sem registros.</p>';
      boxC.innerHTML = msg; boxR.innerHTML = msg; boxP.innerHTML = msg;
      return;
    }
    const k = c.history.length;
    const it = state.logIter === 0 ? k : Math.min(state.logIter, k);
    const isLatest = it === k;
    iterSel.disabled = false;
    let opts = `<option value="0">Acompanhar a última (${k})</option>`;
    for (let q = k; q >= 1; q--) opts += `<option value="${q}">Iteração ${q}</option>`;
    iterSel.innerHTML = opts;
    iterSel.value = String(state.logIter);

    antSel.disabled = !isLatest;
    if (!isLatest) state.logAnt = 0;
    const nAnts = isLatest ? c.lastAntsSteps.length : 1;
    if (state.logAnt >= nAnts) state.logAnt = 0;
    let aopts = '';
    for (let a = 0; a < nAnts; a++) aopts += `<option value="${a}">Formiga ${a + 1}</option>`;
    antSel.innerHTML = aopts;
    antSel.value = String(state.logAnt);

    const rec = c.history[it - 1];
    const steps = isLatest ? c.lastAntsSteps[state.logAnt] : rec.ant1Steps;
    const ant = rec.ants[state.logAnt];
    boxC.innerHTML = constructHtml(steps, ant, state.logAnt, it);
    boxR.innerHTML = routesHtml(rec);
    boxP.innerHTML = pherHtml(rec);
  }

  function constructHtml(steps, ant, antIdx, it) {
    const c = state.colony;
    if (!steps) return '<p class="muted">Rota fornecida diretamente (teste controlado).</p>';
    let h = `<p class="small">Iteração ${it}, formiga ${antIdx + 1}. Feromônios usados: os do fim da iteração ${it - 1}.</p><ol class="steps">`;
    steps.forEach((s) => {
      if (s.returnToDepot) {
        h += `<li><div class="step-head">Todos os vértices foram visitados. Retorno obrigatório de <b>${esc(vid(s.current))}</b> ao depósito <b>${esc(vid(s.chosen))}</b> (d = ${fmt(c.dist[s.current][s.chosen])}).</div></li>`;
        return;
      }
      h += `<li><div class="step-head">Vértice atual <b>${esc(vid(s.current))}</b>; candidatos ainda não visitados: ${s.candidates.map((x) => esc(vid(x.j))).join(', ')}</div>
        <div class="tscroll"><table class="mini"><thead><tr><th>j</th><th>τ(i,j)</th><th>d(i,j)</th><th>w = τ^α·(1/d)^β</th><th>p(i,j)</th><th>faixa da roleta</th></tr></thead><tbody>`;
      let cum = 0;
      s.candidates.forEach((cd) => {
        const lo = cum; cum += cd.p;
        h += `<tr class="${cd.j === s.chosen ? 'chosen' : ''}"><td>${esc(vid(cd.j))}</td><td>${fmt(cd.tau)}</td><td>${fmt(cd.dist)}</td><td>${fmt(cd.w)}</td><td>${fmt(cd.p)}</td><td>[${fmt(lo, 4)}; ${fmt(cum, 4)})</td></tr>`;
      });
      h += `</tbody></table></div><div class="step-foot">${s.r === null ? `Único candidato restante: p = 1, escolhido <b>${esc(vid(s.chosen))}</b> sem sorteio.` : `Número sorteado r = ${fmt(s.r)} → escolhido <b>${esc(vid(s.chosen))}</b>.`}</div></li>`;
    });
    h += `</ol><p class="route-line">Rota: ${esc(routeStr(ant.route))} · comprimento L = ${fmt(ant.length)}</p>`;
    return h;
  }

  function routesHtml(rec) {
    let h = `<p class="small">Iteração ${rec.iteration}: menor ${fmt(rec.iterBestLength)}, média ${fmt(rec.avgLength)}.</p><div class="tscroll tall"><table class="data"><thead><tr><th>Formiga</th><th>Rota</th><th>Comprimento L</th><th>Depósito Q/L</th></tr></thead><tbody>`;
    const Q = state.colony.config.Q;
    rec.ants.forEach((a, k) => {
      h += `<tr${k === rec.bestAntIndex ? ' class="chosen"' : ''}><td>${k + 1}</td><td>${esc(routeStr(a.route))}</td><td>${fmt(a.length)}</td><td>${fmt(Q / a.length)}</td></tr>`;
    });
    return h + '</tbody></table></div>';
  }

  function pherHtml(rec) {
    const cfg = state.colony.config;
    let h = `<p class="small">τ<sub>novo</sub> = (1 − ${fmt(cfg.rho)})·τ<sub>anterior</sub> + Σ Q/L<sub>k</sub>, com Q = ${fmt(cfg.Q)}. Aplicado depois que as ${rec.ants.length} formigas terminaram.</p>
      <div class="tscroll tall"><table class="data"><thead><tr><th>Aresta</th><th>d</th><th>Anterior</th><th>Após evaporação</th><th>Depósito total</th><th>Formigas</th><th>Final</th><th>Variação</th></tr></thead><tbody>`;
    rec.edgeLog.forEach((e) => {
      const diff = e.final - e.before;
      const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : '';
      h += `<tr title="${esc(ACO.formatEdgeLog(e))}"><td>${esc(vid(e.i))}–${esc(vid(e.j))}</td><td>${fmt(state.colony.dist[e.i][e.j])}</td><td>${fmt(e.before)}</td><td>${fmt(e.afterEvap)}</td><td>${fmt(e.deposit)}</td><td>${e.ants}</td><td>${fmt(e.final)}${e.floorApplied ? ' (piso)' : ''}</td><td class="${cls}">${diff > 0 ? '▲' : diff < 0 ? '▼' : '='} ${fmt(Math.abs(diff))}</td></tr>`;
    });
    return h + '</tbody></table></div>';
  }

  function bindGraphEvents() {
    const svg = $('#graph');
    const tip = $('#tooltip');
    const wrap = $('#graph-wrap');
    svg.addEventListener('mousemove', (ev) => {
      const t = ev.target.closest && ev.target.closest('.hit');
      if (!t || !state.colony || state.dirty) { tip.hidden = true; return; }
      tip.innerHTML = edgeHtml(+t.dataset.i, +t.dataset.j);
      tip.hidden = false;
      const r = wrap.getBoundingClientRect();
      let x = ev.clientX - r.left + 14;
      const y = ev.clientY - r.top + 14;
      if (x + 260 > r.width) x = Math.max(4, ev.clientX - r.left - 270);
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    });
    svg.addEventListener('mouseleave', () => { tip.hidden = true; });
    svg.addEventListener('click', (ev) => {
      const t = ev.target.closest && ev.target.closest('.hit');
      if (!t) return;
      state.selectedEdge = [+t.dataset.i, +t.dataset.j];
      renderGraph();
      renderEdgePanel();
    });
  }

  function bind() {
    $('#vertex-body').addEventListener('input', (ev) => {
      const el = ev.target;
      if (!el.dataset.f) return;
      state.vertices[+el.dataset.k][el.dataset.f] = el.value;
      if (el.dataset.f === 'id') renderDepotSelect();
      markDirty();
    });
    $('#vertex-body').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-remove]');
      if (!b || state.vertices.length <= 4) return;
      const k = +b.dataset.remove;
      state.vertices.splice(k, 1);
      if (state.depotIndex === k) state.depotIndex = 0;
      else if (state.depotIndex > k) state.depotIndex--;
      state.selectedEdge = null;
      renderVertexTable();
      markDirty();
    });
    $('#btn-add').addEventListener('click', () => {
      if (state.vertices.length >= 12) return;
      const [x, y] = freeSpot();
      state.vertices.push({ id: nextId(), x: String(x), y: String(y) });
      renderVertexTable();
      markDirty();
      const k = state.vertices.length - 1;
      document.getElementById(`v${k}-x`).focus();
    });
    $('#btn-scenario').addEventListener('click', () => loadPreset(SCENARIO, SCENARIO_PARAMS));
    $('#btn-ref').addEventListener('click', () => loadPreset(REFERENCE, REFERENCE_PARAMS));
    $('#depot').addEventListener('change', (ev) => { state.depotIndex = +ev.target.value; markDirty(); });
    PARAM_KEYS.forEach((k) => $('#p-' + k).addEventListener('input', markDirty));

    $('#btn-run').addEventListener('click', run);
    $('#btn-pause').addEventListener('click', pause);
    $('#btn-step').addEventListener('click', stepOnce);
    $('#btn-reset').addEventListener('click', applyConfig);

    const speed = $('#speed');
    const out = $('#speed-out');
    const upd = () => { out.textContent = `${speed.value} ms`; };
    speed.addEventListener('input', upd);
    upd();

    $('#show-labels').addEventListener('change', renderGraph);
    $('#edge-select').addEventListener('change', (ev) => {
      const v = ev.target.value;
      state.selectedEdge = v ? v.split('-').map(Number) : null;
      renderGraph();
      renderEdgePanel();
    });
    $('#log-iter').addEventListener('change', (ev) => { state.logIter = +ev.target.value; renderLogs(); });
    $('#log-ant').addEventListener('change', (ev) => { state.logAnt = +ev.target.value; renderLogs(); });
    bindGraphEvents();
  }

  bind();
  loadPreset(SCENARIO, SCENARIO_PARAMS);
})();
