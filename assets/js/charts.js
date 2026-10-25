/*
=========================================================
 Umbau Hintersun 8 – Charts
=========================================================
*/
(function () {
  var charts = {};
  function destroy(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }
  function make(id, type, data, options) {
    var el = document.getElementById(id); if (!el || !window.Chart) return;
    destroy(id);
    charts[id] = new Chart(el, {
      type: type, data: data,
      options: Object.assign({
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#dbe8fa' } }, tooltip: { mode: 'index', intersect: false } },
        scales: { x: { ticks: { color: '#9fb1c9' }, grid: { color: 'rgba(255,255,255,.06)' } }, y: { ticks: { color: '#9fb1c9' }, grid: { color: 'rgba(255,255,255,.06)' } } }
      }, options || {})
    });
  }

  function renderAll(data, calc, energyOverrides) {
    var months = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    var costs = calc.calcCosts(data), fin = calc.calcFinancing(data), energy = calc.calcEnergy(data, null, energyOverrides), prog = calc.calcProgress(data);
    var budget = costs.budget;
    var pv = calc.monthlyPV(data, energyOverrides), load = calc.monthlyLoad(data, energyOverrides);
    var aut = months.map(function (m, i) { return Math.min(95, Math.round(Math.min(pv[i], load[i]) / (load[i] || 1) * 100)); });

    // Kostenverteilung nach Budgetblock (Bedarf je Block)
    var blockLabels = budget.rows.map(function (r) { return r.block; });
    var blockVals = budget.rows.map(function (r) { return Math.round(r.need); });
    make('chart-costs', 'doughnut', { labels: blockLabels, datasets: [{ data: blockVals, backgroundColor: ['#2F5D62', '#3E6B8B', '#B4682E', '#A9791F', '#3C7A4E', '#8a6d3b', '#6d8a99'] }] }, { scales: {} });

    // Finanzierungszusammensetzung gesamt
    make('chart-finance', 'bar', { labels: ['Eigenkapital', 'Förderung', 'Zinsb. Darlehen', 'Kredit', 'Lücke'],
      datasets: [{ label: 'EUR', data: [fin.gesamt.ek, fin.gesamt.foerd, fin.gesamt.zdl, fin.gesamt.kredit, fin.gesamt.luecke],
        backgroundColor: ['#3C7A4E', '#51d88a', '#3E6B8B', '#5fb1ff', '#B24439'] }] }, { plugins: { legend: { display: false } } });

    // Finanzierung nach Typ (Detail-Tab)
    var fgroups = { 'Eigenkapital': 0, 'Förderung': 0, 'Darlehen & Kredit': 0, 'Steuerabschreibung': 0 };
    (data.financing || []).forEach(function (f) {
      var t = String(f.type).toLowerCase(), amt = calc.num(f.amount);
      if (t.indexOf('eigenkapital') >= 0) fgroups['Eigenkapital'] += amt;
      else if (t.indexOf('förder') >= 0 || t.indexOf('zuschuss') >= 0) fgroups['Förderung'] += amt;
      else if (t.indexOf('steuer') >= 0 || t.indexOf('bonus') >= 0) fgroups['Steuerabschreibung'] += amt;
      else fgroups['Darlehen & Kredit'] += amt;
    });
    make('chart-finance-detail', 'doughnut', { labels: Object.keys(fgroups), datasets: [{ data: Object.values(fgroups), backgroundColor: ['#66e3c4', '#51d88a', '#5fb1ff', '#ffb84d'] }] }, { scales: {} });

    // Überblick: Kostenschätzung vs Ist, gestapelt nach W1/W2
    make('chart-cost-compare', 'bar', {
      labels: ['Kostenschätzung', 'Ist-Kosten', 'Finanzbedarf'],
      datasets: [
        { label: 'W1 / Ingrid', data: [budget.totals.planW1, budget.totals.istW1, budget.totals.needW1], backgroundColor: '#B4682E' },
        { label: 'W2 / Maximilian', data: [budget.totals.planW2, budget.totals.istW2, budget.totals.needW2], backgroundColor: '#3E6B8B' }
      ]
    }, { plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: function (v) { return (v / 1000) + 'k'; } } } } });

    make('chart-month', 'bar', { labels: months, datasets: [{ label: 'PV', data: pv, backgroundColor: 'rgba(102,227,196,.65)' }, { label: 'Last', data: load, backgroundColor: 'rgba(95,177,255,.45)' }] }, {});

    make('chart-autarky', 'line', { labels: months, datasets: [
      { label: 'Autarkie %', data: aut, borderColor: '#66e3c4', backgroundColor: 'rgba(102,227,196,.15)', tension: .35, fill: true },
      { label: 'Ziel 50%', data: months.map(function () { return 50; }), borderColor: '#ffb84d', borderDash: [6, 6], pointRadius: 0 },
      { label: 'Ziel 65%', data: months.map(function () { return 65; }), borderColor: '#51d88a', borderDash: [6, 6], pointRadius: 0 }
    ] }, { scales: { y: { min: 0, max: 100, ticks: { color: '#9fb1c9', callback: function (v) { return v + '%'; } } } } });

    make('chart-progress', 'bar', { labels: ['Zeit bis Baubeginn', 'Aufgaben', 'Zeit bis Erstbezug'], datasets: [{ label: '%', data: [prog.timeToBuild, prog.taskProgress, prog.timeToOcc], backgroundColor: ['#5fb1ff', '#66e3c4', '#b78cff'] }] }, { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { max: 100, ticks: { callback: function (v) { return v + '%'; }, color: '#9fb1c9' } } } });

    make('chart-energy', 'bar', { labels: ['Strombedarf', 'PV-Ertrag', 'Netzbezug', 'Einspeisung'], datasets: [{ label: 'kWh/a', data: [energy.total, energy.pvAnnual, energy.grid, energy.feedIn], backgroundColor: ['#5fb1ff', '#66e3c4', '#ff6b6b', '#ffe066'] }] }, { plugins: { legend: { display: false } } });

    var batt = [0, 5, 8, 10, 12, 14, 16, 20].map(function (b) { return Math.min(85, Math.round(30 + Math.log1p(b) * 12 + (energy.maxKwp - 7) * 2)); });
    make('chart-battery', 'line', { labels: [0, 5, 8, 10, 12, 14, 16, 20].map(function (x) { return x + ' kWh'; }), datasets: [{ label: 'Autarkie %', data: batt, borderColor: '#66e3c4', backgroundColor: 'rgba(102,227,196,.16)', fill: true, tension: .35 }] }, { scales: { y: { min: 0, max: 100, ticks: { callback: function (v) { return v + '%'; }, color: '#9fb1c9' } } } });
  }

  window.HinterSunCharts = { renderAll: renderAll };
})();
