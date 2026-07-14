/*
=========================================================
 Umbau Hintersun 8 – App (Wiring & Rendering)
=========================================================
*/
(function () {
  var S = window.HinterSunStore;
  var F = window.HinterSunForms;
  var G = window.HinterSunGantt;
  var C = window.HinterSunCalc;
  var Charts = window.HinterSunCharts;

  function byId(id) { return document.getElementById(id); }
  function qsa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(v) { return String(v == null ? '' : v).replace(/[<>&]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]; }); }
  function tag(status) {
    var s = String(status || '').toLowerCase(); var cls = 'blue';
    if (s.indexOf('erledigt') >= 0 || s.indexOf('bezahlt') >= 0 || s.indexOf('beauftragt') >= 0 || s.indexOf('zugesagt') >= 0 || s.indexOf('auftrag erteilt') >= 0) cls = 'ok';
    else if (s.indexOf('kritisch') >= 0 || s.indexOf('blockiert') >= 0 || s.indexOf('gefährdet') >= 0 || s.indexOf('verworfen') >= 0) cls = 'danger';
    else if (s.indexOf('offen') >= 0 || s.indexOf('wartet') >= 0 || s.indexOf('angebot') >= 0 || s.indexOf('nötig') >= 0 || s.indexOf('rückfrage') >= 0) cls = 'warn';
    return '<span class="tag ' + cls + '">' + esc(status) + '</span>';
  }
  function eur(v) { return C.euro(v); }

  var DATA;
  var energyOverrides = {};

  // ---- generischer Tabellen-Renderer mit Aktionen ----------------------
  function section(containerId, sheet, cols, opts) {
    opts = opts || {};
    var el = byId(containerId); if (!el) return;
    var rows = (DATA[sheet] || []).slice();
    if (opts.filter) rows = rows.filter(opts.filter);
    if (opts.sort) rows.sort(opts.sort);
    var idf = S.idField(sheet);
    var head = cols.map(function (c) { return '<th>' + esc(c.h) + '</th>'; }).join('') + '<th class="actions-col"></th>';
    var body = rows.map(function (r) {
      var tds = cols.map(function (c) { return '<td>' + (c.get(r) == null ? '' : c.get(r)) + '</td>'; }).join('');
      var extra = opts.rowActions ? opts.rowActions(r) : '';
      var actions = '<td class="actions">' + extra +
        '<button class="icon-btn" title="Bearbeiten" data-edit="' + esc(r[idf]) + '">✎</button>' +
        '<button class="icon-btn danger" title="Löschen" data-del="' + esc(r[idf]) + '">🗑</button></td>';
      return '<tr>' + tds + actions + '</tr>';
    }).join('');
    var addBtn = opts.noAdd ? '' : '<button class="btn small" data-add>+ ' + esc(S.labelOf(sheet)) + '</button>';
    el.innerHTML =
      '<div class="section-tools">' + (opts.note ? '<span class="mini muted">' + opts.note + '</span>' : '<span></span>') + addBtn + '</div>' +
      '<div class="table-wrap"><table><thead><tr>' + head + '</tr></thead><tbody>' +
      (body || '<tr><td colspan="' + (cols.length + 1) + '" class="muted">Keine Einträge – oben hinzufügen.</td></tr>') +
      '</tbody></table></div>';
    var add = el.querySelector('[data-add]'); if (add) add.addEventListener('click', function () { F.open(sheet); });
    el.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { F.open(sheet, b.getAttribute('data-edit')); }); });
    el.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', async function () { if (confirm('Eintrag löschen?')) await S.remove(sheet, b.getAttribute('data-del')); }); });
    if (opts.wire) opts.wire(el);
  }

  // ---- KPIs & Übersicht -------------------------------------------------
  function renderOverview() {
    var prog = C.calcProgress(DATA), costs = C.calcCosts(DATA), fin = C.calcFinancing(DATA), en = C.calcEnergy(DATA), s = C.settingsObj(DATA);
    var ampel = C.calcAmpel(DATA);
    byId('source-pill').innerHTML = '<span class="status-dot ' + (S.state.online ? 'on' : '') + '"></span>' + esc(S.state.source);
    byId('kpi-progress').textContent = C.pct(prog.taskProgress);
    byId('kpi-progress-sub').textContent = 'Zeit bis Erstbezug ' + C.pct(prog.timeToOcc) + ' · ' + prog.risk;
    byId('kpi-cost').textContent = eur(costs.need);
    byId('kpi-cost-sub').innerHTML = 'W1 ' + eur(costs.needW1) + ' · W2 ' + eur(costs.needW2);
    byId('kpi-finance').textContent = eur(fin.gesamt.luecke);
    byId('kpi-finance-sub').textContent = 'Rate ~' + eur(fin.gesamt.rateNetto) + '/Monat netto';
    byId('kpi-energy').textContent = C.pct(en.autarky);
    byId('kpi-energy-sub').textContent = 'PV ' + en.maxKwp.toFixed(1) + ' kWp · Batterie ' + en.batteryRecommendation;

    function lampCls(l) { return l === 'gruen' ? 'ok' : l === 'gelb' ? 'warn' : 'danger'; }
    function lamp(title, a) {
      return '<div class="ampel-item ' + lampCls(a.level) + '">' +
        '<span class="ampel-light"></span>' +
        '<div class="ampel-text"><strong>' + esc(title) + '</strong><span class="ampel-label">' + esc(a.label) + '</span>' +
        '<span class="ampel-detail">' + esc(a.detail) + '</span></div></div>';
    }
    // gesamt/W1/W2-Zeile prominent oben
    var gwRow =
      '<div class="gw-strip">' +
        '<div class="gw-item"><span class="gw-label">Gesamtbedarf</span><span class="gw-val">' + eur(costs.need) + '</span></div>' +
        '<div class="gw-item w1"><span class="gw-label">W1 · Ingrid</span><span class="gw-val">' + eur(costs.needW1) + '</span></div>' +
        '<div class="gw-item w2"><span class="gw-label">W2 · Maximilian</span><span class="gw-val">' + eur(costs.needW2) + '</span></div>' +
        '<div class="gw-item"><span class="gw-label">Ist bezahlt</span><span class="gw-val">' + eur(costs.paid) + '</span></div>' +
        '<div class="gw-item"><span class="gw-label">Lücke</span><span class="gw-val ' + (fin.gesamt.luecke > 0 ? 'danger' : 'ok') + '">' + eur(fin.gesamt.luecke) + '</span></div>' +
      '</div>';
    byId('overview-summary').innerHTML =
      gwRow +
      '<div class="ampel-head"><span class="ampel-overall ' + lampCls(ampel.overall) + '">' +
        (ampel.overall === 'gruen' ? 'Gesamt: auf Kurs' : ampel.overall === 'gelb' ? 'Gesamt: Achtung' : 'Gesamt: kritisch') +
      '</span><span class="tag blue">' + prog.daysToBuild + ' Tage bis Baubeginn</span>' +
      '<span class="tag blue">' + prog.daysToOcc + ' Tage bis Erstbezug</span></div>' +
      '<div class="ampel-grid">' +
        lamp('Zeit', ampel.zeit) + lamp('Kosten', ampel.kosten) +
        lamp('Bürokratie', ampel.buero) + lamp('Vergabe', ampel.vergabe) +
      '</div>';

    var next = (DATA.timeline_tasks || []).filter(function (t) { return String(t.status).toLowerCase().indexOf('erledigt') < 0; })
      .sort(function (a, b) { return prio(b.priority) - prio(a.priority) || String(a.due_date).localeCompare(String(b.due_date)); }).slice(0, 6);
    byId('overview-next').innerHTML = next.map(function (t) { return '<div class="task" data-open="' + esc(t.task_id) + '"><strong>' + esc(t.task) + '</strong><small>' + esc(t.phase) + ' · ' + tag(t.status) + ' · ' + esc(t.priority) + '</small></div>'; }).join('') || '<p class="muted">Keine offenen Aufgaben.</p>';
    byId('overview-next').querySelectorAll('[data-open]').forEach(function (n) { n.addEventListener('click', function () { F.open('timeline_tasks', n.getAttribute('data-open')); }); });

    // Timeline-Ausschnitt: nächste datierte Termine/Vorgänge chronologisch
    var today = new Date();
    var upcoming = (DATA.timeline_tasks || []).filter(function (t) { var d = new Date(t.start_date || t.due_date); return !isNaN(d) && d >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1) && String(t.status).toLowerCase().indexOf('erledigt') < 0; })
      .sort(function (a, b) { return String(a.start_date || a.due_date).localeCompare(String(b.start_date || b.due_date)); }).slice(0, 6);
    var tlEl = byId('overview-timeline');
    if (tlEl) {
      tlEl.innerHTML = upcoming.length ? '<div class="tl-mini">' + upcoming.map(function (t) {
        var d = t.start_date || t.due_date;
        var isTermin = String(t.task_type).toLowerCase() === 'termin' || t.start_date === t.due_date;
        return '<div class="tl-mini-row" data-open="' + esc(t.task_id) + '">' +
          '<span class="tl-mini-date">' + esc(d) + '</span>' +
          '<span class="tl-mini-ico">' + (isTermin ? '◆' : '▬') + '</span>' +
          '<span class="tl-mini-task">' + esc(t.task) + '</span>' +
          '<span class="tl-mini-owner">' + esc(t.owner || '') + '</span></div>';
      }).join('') + '</div>' : '<p class="muted">Keine anstehenden Termine.</p>';
      tlEl.querySelectorAll('[data-open]').forEach(function (n) { n.addEventListener('click', function () { F.open('timeline_tasks', n.getAttribute('data-open')); }); });
    }
  }
  function prio(p) { return { kritisch: 4, hoch: 3, mittel: 2, niedrig: 1 }[String(p).toLowerCase()] || 0; }

  // ---- Projekt & Parteien ----------------------------------------------
  function renderProject() {
    section('party-table', 'areas', [
      { h: 'Einheit', get: function (r) { return esc(r.unit); } },
      { h: 'Partei', get: function (r) { return esc(r.party); } },
      { h: 'Wohnfläche', get: function (r) { return esc(r.real_area_m2) + ' m²'; } },
      { h: 'virt. Fläche', get: function (r) { return esc(r.virtual_area_m2); } },
      { h: 'Tausendstel', get: function (r) { return '<strong>' + esc(r.thousandths) + '/1000</strong>'; } },
      { h: 'Notiz', get: function (r) { return esc(r.notes); } }
    ], { note: 'Standard-Aufteilung W1/W2: 46,6 / 53,4 (frei editierbar je Position).' });
  }

  // ---- Kosten & Finanzierung -------------------------------------------
  // ==== KOSTENSCHÄTZUNG (Tab estimate) =================================
  function renderEstimate() {
    var est = C.calcEstimate(DATA);
    var t = est.totals;
    byId('estimate-summary').innerHTML =
      '<div class="grid auto">' +
      card('Grobschätzung gesamt', eur(t.grob), 'erste Kubaturschätzung ±25 %') +
      card('Detailschätzung gesamt', t.detail > 0 ? eur(t.detail) : '—', t.detail > 0 ? 'detaillierte Kalkulation' : 'noch keine Detailwerte') +
      cardSplit('Plan W1 / Ingrid', eur(t.planW1), 'Plan W2 / Maximilian', eur(t.planW2)) +
      '</div>';

    var rows = est.rows.map(function (r) {
      var hasDetail = r.hasDetail && r.detail > 0;
      var delta = hasDetail ? r.detail - r.grob : 0;
      return '<tr>' +
        '<td><strong>' + esc(r.block) + '</strong></td>' +
        '<td>' + eur(r.grob) + '</td>' +
        '<td class="w1cell">' + eur(r.grobW1) + '</td><td class="w2cell">' + eur(r.grobW2) + '</td>' +
        '<td>' + (hasDetail ? eur(r.detail) : '<span class="muted">—</span>') + '</td>' +
        '<td class="w1cell">' + (hasDetail ? eur(r.detailW1) : '') + '</td><td class="w2cell">' + (hasDetail ? eur(r.detailW2) : '') + '</td>' +
        (hasDetail ? '<td class="var ' + (delta > 1 ? 'neg' : delta < -1 ? 'pos' : '') + '">' + (delta > 0 ? '+' : '') + eur(delta) + '</td>' : '<td class="muted">—</td>') +
        '</tr>';
    }).join('');
    byId('budget-blocks').innerHTML =
      '<div class="section-note mini muted">Pro Budgetblock genau zwei Werte: Grobschätzung und (sobald vorhanden) Detailschätzung – jeweils getrennt nach W1 / Ingrid und W2 / Maximilian. Keine Ist-Kosten hier; die stehen im Tab „Kosten (Ist)".</div>' +
      '<div class="table-wrap"><table class="budget-table"><thead><tr>' +
      '<th>Budgetblock</th><th>Grob</th><th class="w1cell">Grob W1</th><th class="w2cell">Grob W2</th>' +
      '<th>Detail</th><th class="w1cell">Detail W1</th><th class="w2cell">Detail W2</th><th>Δ Detail−Grob</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="8" class="muted">Noch keine Kostenblöcke.</td></tr>') +
      '<tr class="total-row"><td>Summe</td><td>' + eur(t.grob) + '</td>' +
      '<td class="w1cell">' + eur(t.grobW1) + '</td><td class="w2cell">' + eur(t.grobW2) + '</td>' +
      '<td>' + (t.detail > 0 ? eur(t.detail) : '—') + '</td>' +
      '<td class="w1cell">' + (t.detail > 0 ? eur(t.detailW1) : '') + '</td><td class="w2cell">' + (t.detail > 0 ? eur(t.detailW2) : '') + '</td>' +
      '<td>' + (t.detail > 0 ? eur(t.detail - t.grob) : '—') + '</td></tr>' +
      '</tbody></table></div>';

    section('budget-estimates-table', 'budget_estimates', [
      { h: 'Budgetblock', get: function (r) { return '<strong>' + esc(r.budget_block) + '</strong>'; } },
      { h: 'Art', get: function (r) { var d = String(r.estimate_type).toLowerCase().indexOf('detail') >= 0; return '<span class="tag ' + (d ? 'blue' : '') + '">' + (d ? 'Detail' : 'Grob') + '</span>'; } },
      { h: 'Brutto', get: function (r) { return eur(r.amount_gross); } },
      { h: 'W1 / Ingrid', get: function (r) { return '<span class="w1cell">' + eur(C.num(r.amount_gross) * (C.num(r.share_w1) || 0) / 100) + '</span>'; } },
      { h: 'W2 / Maximilian', get: function (r) { return '<span class="w2cell">' + eur(C.num(r.amount_gross) * (C.num(r.share_w2) || 0) / 100) + '</span>'; } },
      { h: 'Schlüssel', get: function (r) { return esc(r.share_w1) + '/' + esc(r.share_w2); } }
    ], { note: 'Grobschätzung je Block bearbeiten oder eine Detailschätzung (Art = Detail) mit gleichem Budgetblock ergänzen. Beide Werte bleiben erhalten.', sort: function (a, b2) { return String(a.budget_block).localeCompare(String(b2.budget_block)); } });
  }

  // ==== KOSTEN IST (Tab costs) =========================================
  function renderCostsIst() {
    var bud = C.calcBudget(DATA), saldo = C.calcSaldo(DATA);
    var t = bud.totals;
    byId('cost-summary').innerHTML =
      '<div class="grid auto">' +
      card('Ist-Kosten gesamt', eur(t.ist), 'Aufträge + manuelle Positionen') +
      cardSplit('Ist W1 / Ingrid', eur(t.istW1), 'Ist W2 / Maximilian', eur(t.istW2)) +
      card('davon bezahlt', eur(t.paid), 'Rest offen: ' + eur(t.ist - t.paid)) +
      '</div>';

    // Budgetblöcke: Schätzung vs Ist (dieselben Blöcke wie Kostenschätzung)
    var blockRows = bud.rows.map(function (r) {
      var v = r.variance, vCls = v > 1 ? 'neg' : v < -1 ? 'pos' : '';
      return '<tr>' +
        '<td><strong>' + esc(r.block) + '</strong></td>' +
        '<td class="muted">' + eur(r.plan) + '</td>' +
        '<td>' + eur(r.ist) + '</td>' +
        '<td class="w1cell">' + eur(r.istW1) + '</td><td class="w2cell">' + eur(r.istW2) + '</td>' +
        '<td class="mini muted">' + (r.fromAward > 0 ? 'Vergabe ' + eur(r.fromAward) : '') + (r.fromAward > 0 && r.manual > 0 ? ' · ' : '') + (r.manual > 0 ? 'manuell ' + eur(r.manual) : '') + '</td>' +
        '<td class="var ' + vCls + '">' + (v > 0 ? '+' : '') + eur(v) + '</td>' +
        '</tr>';
    }).join('');
    byId('budget-blocks-costs').innerHTML =
      '<div class="section-note mini muted">Dieselben Budgetblöcke wie in der Kostenschätzung. Ist-Kosten = vergebene Aufträge (aus „Gewerke &amp; Vergabe") + manuell erfasste Positionen. Δ = Ist − Plan.</div>' +
      '<div class="table-wrap"><table class="budget-table"><thead><tr>' +
      '<th>Budgetblock</th><th class="muted">Plan (Schätzung)</th><th>Ist</th><th class="w1cell">Ist W1</th><th class="w2cell">Ist W2</th><th>Herkunft</th><th>Δ Ist−Plan</th></tr></thead><tbody>' +
      (blockRows || '<tr><td colspan="7" class="muted">Noch keine Kostenblöcke.</td></tr>') +
      '<tr class="total-row"><td>Summe</td><td class="muted">' + eur(t.plan) + '</td><td><strong>' + eur(t.ist) + '</strong></td>' +
      '<td class="w1cell">' + eur(t.istW1) + '</td><td class="w2cell">' + eur(t.istW2) + '</td><td></td>' +
      '<td class="var ' + (t.variance > 1 ? 'neg' : t.variance < -1 ? 'pos' : '') + '">' + (t.variance > 0 ? '+' : '') + eur(t.variance) + '</td></tr>' +
      '</tbody></table></div>';

    // Saldo-Panel
    var dir = saldo.direction;
    var msg = dir === 'ausgeglichen' ? 'Ausgeglichen – keine Verrechnung nötig.'
      : dir === 'W2→W1' ? 'Maximilian (W2) schuldet Ingrid (W1) noch ' + eur(saldo.amount) + '.'
      : 'Ingrid (W1) schuldet Maximilian (W2) noch ' + eur(saldo.amount) + '.';
    byId('saldo-panel').innerHTML =
      '<div class="saldo-box ' + (dir === 'ausgeglichen' ? 'ok' : 'warn') + '">' +
      '<div class="saldo-amount">' + (dir === 'ausgeglichen' ? '0 €' : eur(saldo.amount)) + '</div>' +
      '<div class="saldo-dir">' + esc(msg) + '</div></div>' +
      '<p class="mini muted" style="margin-top:10px">Je Position trägt der Zahler zunächst den vollen Betrag; geschuldet ist nur der eigene Kostenschlüssel-Anteil. Differenz = Ausgleich.</p>';

    section('cost-positions-table', 'cost_positions', [
      { h: 'Datum', get: function (r) { return esc(r.date || ''); } },
      { h: 'Budgetblock', get: function (r) { return esc(r.category); } },
      { h: 'Position', get: function (r) { return esc(r.item); } },
      { h: 'Herkunft', get: function (r) { return r.offer_id || String(r.source_type).toLowerCase() === 'auftrag' ? '<span class="tag ok">Vergabe</span>' : '<span class="tag">manuell</span>'; } },
      { h: 'Betrag', get: function (r) { return eur(r.gross); } },
      { h: 'Bezahlt', get: function (r) { var pa = C.num(r.paid_amount); var g = C.num(r.gross); return pa > 0 ? eur(pa) + (g > 0 && pa < g - 0.01 ? ' <span class="tag warn">Teilzahlung</span>' : ' <span class="tag ok">voll</span>') : '<span class="muted">—</span>'; } },
      { h: 'Offen', get: function (r) { var open = C.num(r.gross) - C.num(r.paid_amount); return open > 0.01 ? eur(open) : '<span class="ok">0 €</span>'; } },
      { h: 'Bezahlt von', get: function (r) { return esc(r.paid_by || '—'); } },
      { h: 'Schlüssel', get: function (r) { return (r.share_w1 != null && r.share_w1 !== '') ? (r.share_w1 + '/' + r.share_w2) : '—'; } },
      { h: 'W1', get: function (r) { return '<span class="w1cell">' + eur(C.shareOf(r, 'w1')) + '</span>'; } },
      { h: 'W2', get: function (r) { return '<span class="w2cell">' + eur(C.shareOf(r, 'w2')) + '</span>'; } }
    ], { note: 'Eine Zeile pro Kostenposition – Betrag, bereits bezahlter Teil, Zahler und Kostenschlüssel in einem. Vergebene Aufträge kommen automatisch aus „Gewerke &amp; Vergabe"; sonstige Kosten hier anlegen, bearbeiten oder löschen. Der Saldo rechnet aus dem tatsächlich bezahlten Betrag.',
         sort: function (a, b) { return String(a.date).localeCompare(String(b.date)); } });
  }

  // ==== FINANZIERUNG (Tab finance) =====================================
  // ==== FINANZIERUNG (Tab finance) =====================================
  function renderFinance() {
    var fin = C.calcFinancing(DATA);
    var g = fin.gesamt;

    // --- 1. Gegenüberstellung Kostenschätzung vs. Ist vs. Bedarf (gesamt/W1/W2) ---
    function cmpRow(label, plan, ist, bedarf, cls) {
      return '<tr class="' + (cls || '') + '"><td><strong>' + esc(label) + '</strong></td>' +
        '<td>' + eur(plan) + '</td><td>' + eur(ist) + '</td><td><strong>' + eur(bedarf) + '</strong></td></tr>';
    }
    byId('finance-summary').innerHTML =
      '<div class="grid auto">' +
      card('Finanzierungsbedarf', eur(fin.bedarfGesamt), 'automatisch aus Kostenschätzung / Ist') +
      cardSplit('Bedarf W1 / Ingrid', eur(fin.bedarfW1), 'Bedarf W2 / Maximilian', eur(fin.bedarfW2)) +
      card('Finanzierungslücke', eur(g.luecke), g.luecke > 0 ? 'noch nicht gedeckt' : 'gedeckt', g.luecke > 0 ? 'danger' : 'ok') +
      '</div>' +
      '<div class="card mt"><div class="card-head"><h3>Kostenschätzung vs. Ist vs. Bedarf</h3><span class="card-hint">Bedarf = höherer Wert aus Schätzung / Ist</span></div>' +
      '<div class="table-wrap"><table class="budget-table"><thead><tr><th></th><th>Kostenschätzung</th><th>Ist-Kosten</th><th>Finanzbedarf</th></tr></thead><tbody>' +
      cmpRow('Gesamt', fin.planGesamt, fin.istGesamt, fin.bedarfGesamt, 'total-row') +
      '<tr><td class="w1cell"><strong>W1 / Ingrid</strong></td><td class="w1cell">' + eur(fin.planW1) + '</td><td class="w1cell">' + eur(fin.istW1) + '</td><td class="w1cell"><strong>' + eur(fin.bedarfW1) + '</strong></td></tr>' +
      '<tr><td class="w2cell"><strong>W2 / Maximilian</strong></td><td class="w2cell">' + eur(fin.planW2) + '</td><td class="w2cell">' + eur(fin.istW2) + '</td><td class="w2cell"><strong>' + eur(fin.bedarfW2) + '</strong></td></tr>' +
      '</tbody></table></div></div>';

    // --- 2. Finanzierungsbausteine pro Wohnung ---
    function bausteinRow(label, betrag, extra, cls) {
      return '<div class="fin-row"><span class="fin-row-label">' + esc(label) + '</span>' +
        (extra ? '<span class="fin-row-party">' + extra + '</span>' : '') +
        '<span class="fin-row-amt ' + (cls || '') + '">' + eur(betrag) + '</span></div>';
    }
    function wohnungCard(title, w, cls) {
      var rate = w.rateNetto;
      var html = '<div class="fin-block ' + cls + '">' +
        '<div class="fin-block-head"><span class="fin-icon">🏠</span><strong>' + esc(title) + '</strong>' +
          '<span class="fin-block-total">' + eur(w.bedarf) + '</span></div>' +
        '<div class="fin-block-detail">' +
          bausteinRow('Eigenkapital', w.ek) +
          bausteinRow('Landesförderung (Zuschuss)', w.foerd, '', 'ok') +
          bausteinRow('Zinsbegünstigtes Darlehen', w.zdl) +
          (w.zdl > 0 ? '<div class="fin-rate-grid">' +
            '<div class="fin-rate-item"><span class="fin-rate-label">Rate ZDL brutto</span><span class="fin-rate-val">' + eur(w.zdlRate) + '/M</span></div>' +
            '<div class="fin-rate-item ok"><span class="fin-rate-label">Rückvergütung Steuer</span><span class="fin-rate-val ok">−' + eur(w.zdlRefundAnnual) + '/Jahr</span></div>' +
            '<div class="fin-rate-item"><span class="fin-rate-label">Rate ZDL netto</span><span class="fin-rate-val">' + eur(w.zdlNetRate) + '/M</span></div>' +
            '</div>' : '') +
          bausteinRow('Zusätzlicher Kredit', w.kredit) +
          (w.kredit > 0 ? '<div class="fin-rate-grid"><div class="fin-rate-item"><span class="fin-rate-label">Rate Kredit</span><span class="fin-rate-val">' + eur(w.kreditRate) + '/M</span></div></div>' : '') +
          '<div class="fin-need-divider"></div>' +
          '<div class="fin-row"><span class="fin-row-label"><strong>Summe Finanzierungsquellen</strong></span><span class="fin-row-amt"><strong>' + eur(w.deckung) + '</strong></span></div>' +
          '<div class="fin-row"><span class="fin-row-label">Verbleibende Lücke</span><span class="fin-row-amt ' + (w.luecke > 0 ? 'danger' : 'ok') + '">' + eur(w.luecke) + '</span></div>' +
          '<div class="fin-row"><span class="fin-row-label"><strong>Monatsrate (netto)</strong></span><span class="fin-row-amt"><strong>' + eur(rate) + '/Monat</strong></span></div>' +
        '</div></div>';
      return html;
    }
    byId('finance-detail').innerHTML =
      '<div class="grid two">' +
        wohnungCard('W1 · Ingrid (Wohnung A)', fin.w1, 'fin-w1') +
        wohnungCard('W2 · Maximilian (Wohnung B)', fin.w2, 'fin-w2') +
      '</div>' +
      (fin.gem && (fin.gem.ek || fin.gem.foerd || fin.gem.zdl || fin.gem.kredit) ?
        '<div class="card mt"><div class="card-head"><h3>Gemeinsame Bausteine</h3></div>' +
        bausteinRow('Eigenkapital', fin.gem.ek) + bausteinRow('Förderung', fin.gem.foerd) +
        bausteinRow('Darlehen', fin.gem.zdl) + bausteinRow('Kredit', fin.gem.kredit) + '</div>' : '') +
      // --- 3. Steuerabschreibungen als EIGENER Punkt (Rückfluss) ---
      '<div class="card mt fin-tax-card"><div class="card-head"><h3>Steuerabschreibungen (Rückvergütung über die Jahre)</h3>' +
        '<span class="card-hint">kein Finanzierungsmittel – Rückfluss</span></div>' +
        '<p class="mini muted">Sanierung, Klimahaus/EcoBonus, Möbelbonus u. a. fließen über die Steuererklärung zurück und senken die effektiven Kosten. Sie zählen NICHT als Finanzierungsquelle und sind daher separat ausgewiesen.</p>' +
        '<div id="tax-writeoffs" class="mt"></div>' +
        '<div class="fin-row total-row" style="margin-top:8px"><span class="fin-row-label"><strong>Summe möglicher Steuerrückfluss</strong></span>' +
        '<span class="fin-row-amt ok"><strong>' + eur(fin.steuerGesamt) + '</strong></span></div>' +
      '</div>' +
      // --- 4. Ratenübersicht gesamt ---
      '<div class="card mt"><div class="card-head"><h3>Ratenübersicht gesamt</h3></div>' +
        '<div class="grid auto">' +
        card('Rate brutto', eur(g.rateBrutto) + '/M', 'ZDL + Kredit vor Rückvergütung') +
        card('Steuer-Rückvergütung', '−' + eur(g.zdlRefundAnnual / 12) + '/M', eur(g.zdlRefundAnnual) + '/Jahr über 10 Jahre', 'ok') +
        card('Rate netto', eur(g.rateNetto) + '/M', 'effektive Monatsbelastung') +
        cardSplit('Rate W1', eur(fin.w1.rateNetto) + '/M', 'Rate W2', eur(fin.w2.rateNetto) + '/M') +
        '</div></div>';

    // Steuerabschreibungen-Tabelle (editierbar)
    var taxRows = (DATA.financing || []).filter(function (f) { return String(f.type).toLowerCase().indexOf('steuer') >= 0 || String(f.type).toLowerCase().indexOf('bonus') >= 0; });
    byId('tax-writeoffs').innerHTML = '<div class="table-wrap"><table><thead><tr><th>Abschreibung</th><th>Partei</th><th>Betrag</th><th>Zeitraum</th><th>pro Jahr</th></tr></thead><tbody>' +
      (taxRows.map(function (f) {
        var y = C.num(f.term_years) || 10, amt = C.num(f.amount);
        return '<tr><td>' + esc(f.type) + '</td><td>' + esc(f.party) + '</td><td class="ok">' + eur(amt) + '</td><td>' + y + ' Jahre</td><td>' + eur(amt / y) + '/Jahr</td></tr>';
      }).join('') || '<tr><td colspan="5" class="muted">Keine Steuerabschreibungen erfasst.</td></tr>') + '</tbody></table></div>';

    // Finanzierungsbausteine-Tabelle (alle editierbar)
    section('financing-table', 'financing', [
      { h: 'Typ', get: function (r) { return esc(r.type); } },
      { h: 'Partei', get: function (r) { return esc(r.party); } },
      { h: 'Betrag', get: function (r) { return eur(r.amount); } },
      { h: 'Zins', get: function (r) { return r.interest_rate ? r.interest_rate + '%' : '—'; } },
      { h: 'Laufzeit', get: function (r) { return r.term_years ? r.term_years + ' J' : '—'; } },
      { h: 'Rate', get: function (r) { var a = C.annuity(C.num(r.amount), C.num(r.interest_rate) || 0, C.num(r.term_years) || 0); return a ? eur(a) + '/M' : '—'; } },
      { h: 'Status', get: function (r) { return tag(r.status); } }
    ], { note: 'Alle Bausteine editierbar. Eigenkapital / Landesförderung (Zuschuss) / Zinsbegünstigtes Darlehen / Bankkredit / Steuerabschreibung – Typ bestimmt die Zuordnung. Raten werden aus Betrag, Zins und Laufzeit berechnet.' });

    section('subsidies-table', 'subsidies', [
      { h: 'Programm', get: function (r) { return esc(r.program); } },
      { h: 'Partei', get: function (r) { return esc(r.party); } },
      { h: 'Status', get: function (r) { return tag(r.status); } },
      { h: 'Frist', get: function (r) { return esc(r.deadline || '—'); } },
      { h: 'Voraussetzungen', get: function (r) { return esc(r.requirements || r.comment || ''); } }
    ]);
    section('bank-offers-table', 'bank_offers', [
      { h: 'Bank', get: function (r) { return esc(r.bank); } },
      { h: 'Partei', get: function (r) { return esc(r.party); } },
      { h: 'Betrag', get: function (r) { return eur(r.amount); } },
      { h: 'Zins / Typ', get: function (r) { return (r.interest_rate || '') + '% ' + esc(r.interest_type || ''); } },
      { h: 'Rate', get: function (r) { return r.monthly_rate ? eur(r.monthly_rate) : eur(C.annuity(C.num(r.amount), C.num(r.interest_rate) || 0, C.num(r.term_years) || 0)); } },
      { h: 'Status', get: function (r) { return tag(r.status); } }
    ]);
  }

  function card(label, value, sub, cls) {
    return '<div class="card"><h4>' + esc(label) + '</h4><div class="kpi-value ' + (cls || '') + '">' + value + '</div><div class="kpi-sub">' + esc(sub || '') + '</div></div>';
  }
  function cardSplit(l1, v1, l2, v2) {
    return '<div class="card split-card">' +
      '<div class="split-half w1"><h4>' + esc(l1) + '</h4><div class="kpi-value">' + v1 + '</div></div>' +
      '<div class="split-half w2"><h4>' + esc(l2) + '</h4><div class="kpi-value">' + v2 + '</div></div>' +
      '</div>';
  }

  // ---- Zeitplan (Gantt + Aufgaben + Kategorien) ------------------------
  function renderTimeline() {
    var s = C.settingsObj(DATA);
    byId('build-date').value = s.target_construction_start || '2026-09-01';
    byId('occupancy-date').value = s.target_first_occupancy || '2027-06-30';

    // Kategorien-Filter dynamisch befüllen
    var gf = byId('gantt-filter');
    if (gf) {
      var prev = gf.value;
      var opts = '<option value="">alle Kategorien</option>' +
        (DATA.task_categories || []).map(function (c) { return '<option value="cat:' + esc(c.category_id) + '">' + esc(c.name) + '</option>'; }).join('') +
        '<option value="type:Termin">nur Termine</option><option value="type:Vorgang">nur Vorgänge</option>' +
        '<option value="prio:kritisch">nur kritisch</option>';
      gf.innerHTML = opts;
      gf.value = prev;
    }
    var filterVal = (gf && gf.value) || '';
    var filterFn = null;
    if (filterVal.indexOf('cat:') === 0) { var cid = filterVal.slice(4); filterFn = function (t) { return t.category_id === cid; }; }
    else if (filterVal.indexOf('type:') === 0) { var ty = filterVal.slice(5).toLowerCase(); filterFn = function (t) { return String(t.task_type).toLowerCase() === ty || (ty === 'termin' && t.start_date === t.due_date) || (ty === 'vorgang' && t.start_date !== t.due_date); }; }
    else if (filterVal.indexOf('prio:') === 0) { var pr = filterVal.slice(5).toLowerCase(); filterFn = function (t) { return String(t.priority).toLowerCase() === pr; }; }

    G.render(byId('gantt'), DATA.timeline_tasks || [], {
      data: DATA,
      buildDate: s.target_construction_start, occDate: s.target_first_occupancy,
      filter: filterFn,
      onClick: function (id) { F.open('timeline_tasks', id); }
    });

    // Kategorien verwalten (erstellbar, farblich)
    section('task-categories-table', 'task_categories', [
      { h: 'Farbe', get: function (r) { return '<span class="cat-swatch" style="background:' + esc(r.color || '#888') + '"></span>'; } },
      { h: 'Kategorie', get: function (r) { return '<strong>' + esc(r.name) + '</strong>'; } },
      { h: 'Reihenfolge', get: function (r) { return esc(r.sort); } },
      { h: 'Beschreibung', get: function (r) { return esc(r.comment); } }
    ], { note: 'Hauptkategorien für den Zeitplan – frei erstellbar und farblich unterscheidbar (Architekt, Bauvorgang, Bürokratie, Grundlagen …).' });

    // Aufgabentabelle mit Typ, Kategorie, Beschreibung
    var catNames = {}; (DATA.task_categories || []).forEach(function (c) { catNames[c.category_id] = c; });
    section('tasks-table', 'timeline_tasks', [
      { h: 'Kategorie', get: function (r) { var c = catNames[r.category_id]; return c ? '<span class="cat-pill" style="--catcol:' + esc(c.color) + '">' + esc(c.name) + '</span>' : esc(r.phase); } },
      { h: 'Typ', get: function (r) { var t = String(r.task_type || (r.start_date === r.due_date ? 'Termin' : 'Vorgang')); return '<span class="type-pill ' + (t.toLowerCase() === 'termin' ? 'termin' : 'vorgang') + '">' + esc(t) + '</span>'; } },
      { h: 'Aufgabe', get: function (r) { return '<strong>' + esc(r.task) + '</strong>' + (r.description ? '<br><small class="muted">' + esc(String(r.description).slice(0, 120)) + (String(r.description).length > 120 ? '…' : '') + '</small>' : ''); } },
      { h: 'Verantw.', get: function (r) { return esc(r.owner); } },
      { h: 'Datum / Zeitraum', get: function (r) { return String(r.task_type).toLowerCase() === 'termin' || r.start_date === r.due_date ? '<strong>' + esc(r.start_date) + '</strong>' : esc(r.start_date) + ' → ' + esc(r.due_date); } },
      { h: 'Status', get: function (r) { return tag(r.status) + (String(r.is_blocker).toUpperCase() === 'TRUE' ? ' <span class="tag danger">Blocker</span>' : ''); } },
      { h: 'Prio', get: function (r) { return esc(r.priority); } }
    ], { sort: function (a, b) { return String(a.start_date).localeCompare(String(b.start_date)); } });
  }

  // ---- Gewerke & Firmen -------------------------------------------------
  function renderTrades() {
    // Pro Gewerk: Angebote vergleichen + final vergeben
    var byTrade = {};
    (DATA.trades || []).forEach(function (t) { byTrade[t.trade] = { trade: t, offers: [] }; });
    (DATA.offers || []).forEach(function (o) {
      var key = o.compare_group || o.trade;
      if (!byTrade[key]) byTrade[key] = { trade: { trade: key, status: '' }, offers: [] };
      byTrade[key].offers.push(o);
    });
    var awardHtml = Object.keys(byTrade).map(function (k) {
      var g = byTrade[k];
      var offers = g.offers.slice().sort(function (a, b) { return C.num(a.gross) - C.num(b.gross); });
      var awarded = offers.find(function (o) { return String(o.status) === 'Auftrag erteilt' || String(o.final).toUpperCase() === 'TRUE'; });
      var cheapest = offers[0];
      var offerRows = offers.length ? offers.map(function (o) {
        var isAwd = awarded && o.offer_id === awarded.offer_id;
        var mark = isAwd ? '<span class="tag ok">✓ vergeben</span>' : (o === cheapest ? '<span class="tag blue">günstigstes</span>' : '');
        var btn = isAwd ? '<span class="mini muted">beauftragt</span>'
          : '<button class="btn small award" data-award="' + esc(o.offer_id) + '">vergeben</button>';
        return '<tr><td>' + esc(o.supplier) + '</td><td>' + eur(o.gross) + '</td><td>' + tag(o.status) + ' ' + mark + '</td><td>' + btn + '</td></tr>';
      }).join('') : '<tr><td colspan="4" class="muted">Noch keine Angebote – im Bereich „Angebote" anlegen.</td></tr>';
      return '<div class="trade-award-card">' +
        '<div class="trade-award-head"><strong>' + esc(k) + '</strong>' +
        (awarded ? '<span class="tag ok">vergeben an ' + esc(awarded.supplier) + '</span>' : '<span class="tag warn">offen</span>') + '</div>' +
        '<div class="table-wrap"><table><thead><tr><th>Anbieter</th><th>Brutto</th><th>Status</th><th></th></tr></thead><tbody>' + offerRows + '</tbody></table></div>' +
        '</div>';
    }).join('');
    var el = byId('trades-award');
    el.innerHTML = awardHtml || '<p class="muted">Noch keine Gewerke angelegt.</p>';
    el.querySelectorAll('[data-award]').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!confirm('Dieses Angebot final vergeben? Es wird als Auftrag in „Kosten (Ist)" übernommen; ein bestehender Auftrag derselben Gruppe wird ersetzt.')) return;
        await S.awardOffer(b.getAttribute('data-award'));
      });
    });

    section('trades-table', 'trades', [
      { h: 'Gewerk', get: function (r) { return '<strong>' + esc(r.trade) + '</strong>'; } },
      { h: 'Prio', get: function (r) { return esc(r.priority); } },
      { h: 'Status', get: function (r) { return tag(r.status); } },
      { h: 'Ziel Vergabe', get: function (r) { return esc(r.target_award); } },
      { h: 'Baustart', get: function (r) { return String(r.blocks_construction_start).toUpperCase() === 'TRUE' ? tag('blockiert Baustart') : tag('parallel'); } }
    ]);
    section('offers-table', 'offers', [
      { h: 'Gewerk', get: function (r) { return esc(r.trade); } },
      { h: 'Gruppe', get: function (r) { return esc(r.compare_group || '—'); } },
      { h: 'Anbieter', get: function (r) { return esc(r.supplier); } },
      { h: 'Brutto', get: function (r) { return eur(r.gross); } },
      { h: 'Status', get: function (r) { return tag(r.status); } }
    ], {
      note: 'Angebote zählen NICHT automatisch mit. Erst die finale Vergabe oben macht daraus einen Auftrag in „Kosten (Ist)".',
      rowActions: function (r) {
        var awarded = String(r.status) === 'Auftrag erteilt';
        return awarded ? '<span class="tag ok" style="margin-right:6px">beauftragt</span>'
          : '<button class="btn small award" data-award="' + esc(r.offer_id) + '">vergeben</button>';
      },
      wire: function (el2) {
        el2.querySelectorAll('[data-award]').forEach(function (b) {
          b.addEventListener('click', async function () {
            if (!confirm('Angebot final vergeben?')) return;
            await S.awardOffer(b.getAttribute('data-award'));
          });
        });
      }
    });
    section('companies-table', 'companies', [
      { h: 'Gewerk-ID', get: function (r) { return esc(r.trade_id); } },
      { h: 'Firma', get: function (r) { return esc(r.company); } },
      { h: 'Status', get: function (r) { return tag(r.status); } },
      { h: 'Final', get: function (r) { return String(r.final).toUpperCase() === 'TRUE' ? tag('final') : ''; } }
    ]);
  }

  // ---- Energie (live, formelbasiert, Schieberegler) --------------------
  function renderEnergy() {
    var scEl = byId('energy-scenario');
    var scenario = (scEl && scEl.value) || 'Pellet + WP';
    var base = C.calcEnergy(DATA, scenario);
    var e = C.calcEnergy(DATA, scenario, energyOverrides);

    // Schieberegler-Definitionen (Startwert = aktueller Wert)
    var sliders = [
      { key: 'pvKwp', label: 'PV-Leistung', unit: 'kWp', min: 0, max: Math.max(12, Math.ceil(base.maxKwp)), step: 0.1, value: e.pvKwp, fmt: function (v) { return v.toFixed(1) + ' kWp'; } },
      { key: 'battery', label: 'Batteriespeicher', unit: 'kWh', min: 0, max: 20, step: 1, value: e.battery, fmt: function (v) { return v + ' kWh'; } },
      { key: 'pelletShare', label: 'Pelletanteil an Heizung', unit: '%', min: 0, max: 100, step: 5, value: Math.round(e.pelletShare * 100), fmt: function (v) { return v + ' %'; }, scale: 0.01 },
      { key: 'heatDemand', label: 'Heizwärmebedarf', unit: 'kWh/a', min: 6000, max: 25000, step: 500, value: e.heatDemand, fmt: function (v) { return Math.round(v).toLocaleString('de-AT') + ' kWh/a'; } },
      { key: 'evCount', label: 'E-Autos', unit: '', min: 0, max: 3, step: 1, value: e.evCount, fmt: function (v) { return v + ' Stk'; } },
      { key: 'household', label: 'Haushaltsstrom', unit: 'kWh/a', min: 2000, max: 10000, step: 250, value: e.household, fmt: function (v) { return Math.round(v).toLocaleString('de-AT') + ' kWh/a'; } },
      { key: 'elecPrice', label: 'Strompreis Netzbezug', unit: '€/kWh', min: 0.10, max: 0.45, step: 0.01, value: e.elecPrice, fmt: function (v) { return v.toFixed(2) + ' €/kWh'; } }
    ];
    var sliderHTML = sliders.map(function (sl) {
      return '<div class="slider-row" data-key="' + sl.key + '" data-scale="' + (sl.scale || 1) + '">' +
        '<label>' + esc(sl.label) + '<span class="slider-val" id="sv-' + sl.key + '">' + sl.fmt(sl.key === 'pelletShare' ? sl.value : sl.value) + '</span></label>' +
        '<input type="range" min="' + sl.min + '" max="' + sl.max + '" step="' + sl.step + '" value="' + sl.value + '">' +
        '</div>';
    }).join('');
    var reset = Object.keys(energyOverrides).length ? '<button class="btn small secondary" id="energy-reset">Auf Ausgangswerte zurücksetzen</button>' : '';

    byId('energy-summary').innerHTML =
      '<div class="grid auto">' +
      card('PV-Ertrag', Math.round(e.pvAnnual).toLocaleString('de-AT') + ' kWh/a', e.pvKwp.toFixed(1) + ' kWp (max ' + e.maxKwp.toFixed(1) + ') · PVGIS-basiert') +
      card('Jahresautarkie', C.pct(e.autarky), 'Direkt + Batterie ' + e.battery + ' kWh') +
      card('Netzbezug', Math.round(e.grid).toLocaleString('de-AT') + ' kWh/a', 'Einspeisung ' + Math.round(e.feedIn).toLocaleString('de-AT') + ' kWh/a') +
      card('Energiekosten', eur(e.energyCost) + '/a', 'Netz − Einspeisung + Pellet', e.energyCost < base.energyCost ? 'ok' : '') +
      card('WP-Deckungsgrad', Math.round(e.wpCoverage) + '%', 'Pelletbedarf ~' + Math.round(e.pelletKg) + ' kg/a') +
      card('Speicher-Empfehlung', e.batteryRecommendation, 'sinnvoller Rahmen') +
      '</div>' +
      '<div class="slider-panel"><div class="slider-panel-head"><h4>Live-Auslegung · Schieberegler</h4>' + reset + '</div>' +
      '<p class="mini muted">Alle Werte werden formelbasiert und live neu berechnet (PVGIS-Ertrag, JAZ/COP, Direktverbrauch + Batterie-Modell). Regler ändern nur die Anzeige – zum dauerhaften Speichern die Werte in „Energieparameter“ unten eintragen.</p>' +
      '<div class="slider-grid">' + sliderHTML + '</div></div>';

    // Slider-Events -> Overrides -> re-render (nur Energie + Charts)
    byId('energy-summary').querySelectorAll('.slider-row input').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var row = inp.closest('.slider-row');
        var key = row.getAttribute('data-key');
        var scale = parseFloat(row.getAttribute('data-scale')) || 1;
        var raw = parseFloat(inp.value);
        energyOverrides[key] = raw * scale;
        renderEnergy();
        if (Charts) Charts.renderAll(DATA, C, energyOverrides);
      });
    });
    var rb = byId('energy-reset');
    if (rb) rb.addEventListener('click', function () { energyOverrides = {}; renderEnergy(); if (Charts) Charts.renderAll(DATA, C, energyOverrides); });

    section('energy-inputs-table', 'energy_inputs', [
      { h: 'Modul', get: function (r) { return esc(r.module); } },
      { h: 'Parameter', get: function (r) { return esc(r.name); } },
      { h: 'Wert', get: function (r) { return esc(r.value); } },
      { h: 'Einheit', get: function (r) { return esc(r.unit); } }
    ], { note: 'Basiswerte für alle Formeln. Schieberegler oben überschreiben sie temporär; hier gespeicherte Werte sind die Ausgangsbasis.' });
  }

  // ---- Master render ----------------------------------------------------
  function render() {
    DATA = S.state.data;
    renderOverview(); renderProject();
    renderEstimate(); renderCostsIst(); renderFinance();
    renderTimeline(); renderTrades(); renderEnergy();
    if (Charts && Charts.renderAll) { try { Charts.renderAll(DATA, C, energyOverrides); } catch (e) { console.warn(e); } }
  }

  function setupNav() {
    qsa('.nav button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('.nav button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        qsa('.tab').forEach(function (t) { t.classList.remove('active'); });
        byId(btn.dataset.tab).classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(function () { if (Charts) Charts.renderAll(DATA, C, energyOverrides); if (byId(btn.dataset.tab).querySelector('#gantt')) renderTimeline(); }, 80);
      });
    });
  }

  function setupControls() {
    byId('build-date').addEventListener('change', function (e) { S.update('settings', 'target_construction_start', { value: e.target.value }); });
    byId('occupancy-date').addEventListener('change', function (e) { S.update('settings', 'target_first_occupancy', { value: e.target.value }); });
    var gf = byId('gantt-filter'); if (gf) gf.addEventListener('change', renderTimeline);
    var es = byId('energy-scenario'); if (es) es.addEventListener('change', function () { energyOverrides = {}; renderEnergy(); if (Charts) Charts.renderAll(DATA, C, energyOverrides); });
  }

  async function init() {
    setupNav();
    S.onChange(render);
    await S.load();
    setupControls();
    // Backend-Versions-Check: zeigt Banner wenn alte Version deployt
    if (S.state.online) {
      try {
        var ep = (window.UMB_HINTERSUN_CONFIG || {}).apiUrl || '';
        if (ep) {
          var hres = await fetch(ep + '?action=health&ts=' + Date.now(), { cache: 'no-store' });
          var h = await hres.json();
          var v = h && h.version || '0';
          var major = parseInt(v.split('.')[0] || '0');
          if (major < 5) {
            var banner = document.createElement('div');
            banner.id = 'version-banner';
            banner.className = 'version-banner';
            banner.innerHTML = '⚠️ Backend-Version <strong>' + esc(v) + '</strong> – bitte <strong>Code.gs neu bereitstellen</strong> und <em>Migration: Schema aktualisieren</em> ausführen, damit alle Tabs (z.B. task_categories, budget_estimates) verfügbar sind. ' +
              '<a href="#" class="banner-close">✕ schließen</a>';
            document.querySelector('.main').prepend(banner);
            banner.querySelector('.banner-close').addEventListener('click', function (e) {
              e.preventDefault(); banner.remove();
            });
          }
        }
      } catch (e) { /* Version-Check optional – kein Crash */ }
    }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
