/*
=========================================================
 Umbau Hintersun 8 – Calculations
 - gestufte Kostenlogik (Schätzung/Auftrag/Rechnung/Zahlung/Prognose)
 - Prognose je Budgetblock = max(...) ohne Doppelzählung
 - W1/W2-Aufteilung je Block explizit mitgeführt (nicht nur Gesamt)
 - Baseline- vs. aktuelle Kostenschätzung, immer mit Ist abgeglichen
 - Mehrdimensionale Projektampel (Zeit/Kosten/Bürokratie/Vergabe)
 - dynamische Energie-Auslegung aus energy_inputs (live, formelbasiert,
   mit optionalen Live-Overrides für Schieberegler)
=========================================================
*/
(function () {
  var euro = function (v) { return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v || 0)); };
  // robuster Zahl-Parser: akzeptiert "1.234,56" und "1234.56"
  function n(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    var s = String(v).trim();
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
    var f = parseFloat(s); return isNaN(f) ? 0 : f;
  }
  var pct = function (v) { return Math.round(Number(v || 0)) + '%'; };
  function settingsObj(data) { var o = {}; (data.settings || []).forEach(function (r) { o[r.key] = r.value; }); return o; }
  function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
  function daysBetween(a, b) { return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000)); }
  function isActive(r) { return String(r.active == null ? 'TRUE' : r.active).toUpperCase() !== 'FALSE'; }
  function isTrue(v) { return String(v).toUpperCase() === 'TRUE'; }
  function low(v) { return String(v || '').toLowerCase(); }

  // ---------- Aufteilung W1/W2 (flexibel, editierbar je Position) -------
  function shareOf(rec, party) {
    var g = n(rec.gross || rec.amount || rec.amount_gross || 0);
    var w1 = rec.share_w1, w2 = rec.share_w2;
    if (w1 !== '' && w1 != null && !isNaN(parseFloat(w1))) {
      return party === 'w1' ? g * parseFloat(w1) / 100 : g * (parseFloat(w2) || (100 - parseFloat(w1))) / 100;
    }
    // Fallback: alte split_key / party_assignment-Logik
    var key = low(rec.split_key), pa = low(rec.party_assignment);
    if (key === '100_w1' || pa === 'w1') return party === 'w1' ? g : 0;
    if (key === '100_w2' || pa === 'w2') return party === 'w2' ? g : 0;
    if (key.indexOf('thousandths') >= 0 || key.indexOf('466') >= 0) return party === 'w1' ? g * 0.466 : g * 0.534;
    if (key === '50_50') return g * 0.5;
    if (pa === 'gemeinsam') return g * (party === 'w1' ? 0.466 : 0.534);
    return 0;
  }
  function splitPctOf(rec) {
    var w1 = parseFloat(rec.share_w1);
    if (!isNaN(w1) && rec.share_w1 !== '' && rec.share_w1 != null) return { w1: w1, w2: parseFloat(rec.share_w2) || (100 - w1) };
    var key = low(rec.split_key), pa = low(rec.party_assignment);
    if (key === '100_w1' || pa === 'w1') return { w1: 100, w2: 0 };
    if (key === '100_w2' || pa === 'w2') return { w1: 0, w2: 100 };
    if (pa === 'gemeinsam' || key.indexOf('thousandths') >= 0 || key.indexOf('466') >= 0) return { w1: 46.6, w2: 53.4 };
    if (key === '50_50') return { w1: 50, w2: 50 };
    return { w1: 0, w2: 0 };
  }

  // ---------- Fortschritt -----------------------------------------------
  function calcProgress(data) {
    var s = settingsObj(data);
    var start = new Date(s.project_start || '2025-07-30');
    var build = new Date(s.target_construction_start || '2026-09-01');
    var occ = new Date(s.target_first_occupancy || '2027-06-30');
    var today = new Date();
    var timeToBuild = clamp(((today - start) / (build - start)) * 100, 0, 100);
    var timeToOcc = clamp(((today - start) / (occ - start)) * 100, 0, 100);
    var tasks = data.timeline_tasks || [];
    var total = tasks.reduce(function (a, t) { return a + n(t.progress_weight || 1); }, 0) || 1;
    var done = tasks.filter(function (t) { return low(t.status).indexOf('erledigt') >= 0 || low(t.status).indexOf('bezahlt') >= 0; })
      .reduce(function (a, t) { return a + n(t.progress_weight || 1); }, 0);
    var taskProgress = clamp(done / total * 100, 0, 100);
    var critical = tasks.filter(function (t) { return ['kritisch', 'hoch'].indexOf(low(t.priority)) >= 0 && low(t.status).indexOf('erledigt') < 0; }).length;
    var blockers = tasks.filter(function (t) { return isTrue(t.is_blocker) && low(t.status).indexOf('erledigt') < 0; });
    var diff = taskProgress - timeToOcc;
    var risk = diff >= 5 ? 'im Plan' : diff >= 0 ? 'leicht hinter Plan' : diff >= -10 ? 'kritisch' : 'Zieltermin gefährdet';
    return { timeToBuild: timeToBuild, timeToOcc: timeToOcc, taskProgress: taskProgress, critical: critical, diff: diff, risk: risk,
      blockers: blockers, daysToBuild: daysBetween(today, build), daysToOcc: daysBetween(today, occ) };
  }

  // ---------- Kosten je Budgetblock (gestuft, W1/W2 explizit) -----------
  // Prognose je Block = max(aktive Schätzung, aktive Aufträge, Rechnung, Zahlung)
  // Baseline (grobe Erst-Schätzung) bleibt unveränderlich sichtbar, auch
  // wenn eine Detailschätzung sie als "aktuell" ablöst – Abgleich ist immer live.
  // =========================================================
  //  KOSTEN-MODELL v6 (saubere Trennung, keine Doppelzählung)
  //  - calcEstimate: Kostenschätzung je Block (grob + detail)
  //  - calcActual:   Ist-Kosten je Block (Summe Aufträge + manuell)
  //  - calcBudget:   Gegenüberstellung Schätzung vs. Ist je Block
  //  Alle mit gesamt / W1 / W2.
  // =========================================================

  // Kostenschätzung: pro Block genau 2 Werte (grob, detail)
  function calcEstimate(data) {
    var blocks = {};
    function B(name) {
      name = name || 'Sonstiges';
      if (!blocks[name]) blocks[name] = { block: name,
        grob: 0, grobW1: 0, grobW2: 0, hasGrob: false,
        detail: 0, detailW1: 0, detailW2: 0, hasDetail: false };
      return blocks[name];
    }
    (data.budget_estimates || []).forEach(function (e) {
      if (!isActive(e)) return;
      var b = B(e.budget_block);
      var g = n(e.amount_gross), sp = splitPctOf(e);
      var typ = low(e.estimate_type);
      var isDetail = typ.indexOf('detail') >= 0 || (String(e.is_baseline).toUpperCase() === 'FALSE' && typ.indexOf('grob') < 0);
      if (isDetail) {
        b.detail += g; b.detailW1 += g * sp.w1 / 100; b.detailW2 += g * sp.w2 / 100; b.hasDetail = true;
      } else {
        b.grob += g; b.grobW1 += g * sp.w1 / 100; b.grobW2 += g * sp.w2 / 100; b.hasGrob = true;
      }
    });
    var rows = Object.keys(blocks).map(function (k) {
      var b = blocks[k];
      // maßgeblicher Planwert: Detail falls vorhanden, sonst Grob
      b.plan = b.hasDetail ? b.detail : b.grob;
      b.planW1 = b.hasDetail ? b.detailW1 : b.grobW1;
      b.planW2 = b.hasDetail ? b.detailW2 : b.grobW2;
      return b;
    });
    var totals = rows.reduce(function (a, b) {
      a.grob += b.grob; a.grobW1 += b.grobW1; a.grobW2 += b.grobW2;
      a.detail += b.detail; a.detailW1 += b.detailW1; a.detailW2 += b.detailW2;
      a.plan += b.plan; a.planW1 += b.planW1; a.planW2 += b.planW2;
      return a;
    }, { grob:0,grobW1:0,grobW2:0, detail:0,detailW1:0,detailW2:0, plan:0,planW1:0,planW2:0 });
    return { rows: rows.sort(function (a,b){ return b.plan - a.plan; }), totals: totals, blocks: blocks };
  }

  // Ist-Kosten: echte SUMME aller aktiven Kostenpositionen je Block
  // (Aufträge aus Vergabe + manuelle Positionen). Keine max-Logik,
  // jede Position zählt genau einmal.
  function calcActual(data) {
    var blocks = {};
    function B(name) {
      name = name || 'Sonstiges';
      if (!blocks[name]) blocks[name] = { block: name,
        ist: 0, istW1: 0, istW2: 0,
        paid: 0, paidW1: 0, paidW2: 0,
        fromAward: 0, manual: 0, count: 0 };
      return blocks[name];
    }
    (data.cost_positions || []).filter(isActive).forEach(function (c) {
      var st = low(c.source_type);
      // Angebote zählen NICHT als Ist-Kosten – erst nach Vergabe (Auftrag) oder als manuelle Position
      if (st === 'angebot' || st === 'schaetzung' || st === 'schätzung') return;
      var b = B(c.category);
      var g = n(c.gross);
      var w1 = shareOf(c, 'w1'), w2 = shareOf(c, 'w2');
      b.ist += g; b.istW1 += w1; b.istW2 += w2; b.count++;
      if (c.offer_id || st === 'auftrag') b.fromAward += g; else b.manual += g;
      var pa = n(c.paid_amount);                       // bereits bezahlter Teilbetrag
      if (pa <= 0 && (isTrue(c.paid) || low(c.status).indexOf('bezahlt') >= 0)) pa = g; // Altdaten ohne paid_amount
      if (pa > 0) {
        var frac = g > 0 ? Math.min(1, pa / g) : 1;
        b.paid += pa; b.paidW1 += w1 * frac; b.paidW2 += w2 * frac;
      }
    });
    var rows = Object.keys(blocks).map(function (k){ return blocks[k]; });
    var totals = rows.reduce(function (a, b) {
      a.ist += b.ist; a.istW1 += b.istW1; a.istW2 += b.istW2;
      a.paid += b.paid; a.paidW1 += b.paidW1; a.paidW2 += b.paidW2;
      return a;
    }, { ist:0,istW1:0,istW2:0, paid:0,paidW1:0,paidW2:0 });
    return { rows: rows, totals: totals, blocks: blocks };
  }

  // Gegenüberstellung Schätzung vs. Ist je Block (für Kosten-/Überblick-Tab)
  // Bedarf/Prognose je Block = max(Planschätzung, Ist) — kein Doppelzählen,
  // weil Schätzung und Ist getrennte Kennzahlen sind und wir den höheren als
  // Finanzierungsbedarf ansetzen.
  function calcBudget(data) {
    var est = calcEstimate(data), act = calcActual(data);
    var names = {};
    est.rows.forEach(function (b){ names[b.block] = true; });
    act.rows.forEach(function (b){ names[b.block] = true; });
    var rows = Object.keys(names).map(function (name) {
      var e = est.blocks[name] || { grob:0,grobW1:0,grobW2:0,detail:0,detailW1:0,detailW2:0,plan:0,planW1:0,planW2:0,hasDetail:false,hasGrob:false };
      var a = act.blocks[name] || { ist:0,istW1:0,istW2:0,paid:0,paidW1:0,paidW2:0,fromAward:0,manual:0,count:0 };
      var need = Math.max(e.plan, a.ist), needW1 = Math.max(e.planW1, a.istW1), needW2 = Math.max(e.planW2, a.istW2);
      return {
        block: name,
        grob: e.grob, grobW1: e.grobW1, grobW2: e.grobW2, hasGrob: e.hasGrob,
        detail: e.detail, detailW1: e.detailW1, detailW2: e.detailW2, hasDetail: e.hasDetail,
        plan: e.plan, planW1: e.planW1, planW2: e.planW2,
        ist: a.ist, istW1: a.istW1, istW2: a.istW2, paid: a.paid, paidW1: a.paidW1, paidW2: a.paidW2,
        fromAward: a.fromAward, manual: a.manual, count: a.count,
        need: need, needW1: needW1, needW2: needW2,
        variance: a.ist - e.plan
      };
    });
    var totals = rows.reduce(function (t, r) {
      ['grob','grobW1','grobW2','detail','detailW1','detailW2','plan','planW1','planW2',
       'ist','istW1','istW2','paid','paidW1','paidW2','need','needW1','needW2'].forEach(function (k){ t[k]=(t[k]||0)+r[k]; });
      return t;
    }, {});
    totals.variance = totals.ist - totals.plan;
    return { rows: rows.sort(function (a,b){ return b.need - a.need; }), totals: totals };
  }

  // Kompatibilitäts-Wrapper (alte Aufrufer erwarten calcCosts)
  function calcCosts(data) {
    var b = calcBudget(data);
    var t = b.totals;
    return {
      // Schätzung
      grob: t.grob, detail: t.detail, plan: t.plan, planW1: t.planW1, planW2: t.planW2,
      baseline: t.grob, estimate: t.plan,
      // Ist
      ist: t.ist, istW1: t.istW1, istW2: t.istW2, paid: t.paid, paidW1: t.paidW1, paidW2: t.paidW2,
      // Bedarf (max Schätzung/Ist)
      forecast: t.need, w1: t.needW1, w2: t.needW2,
      need: t.need, needW1: t.needW1, needW2: t.needW2,
      open: t.need - t.paid, variance: t.variance,
      budget: b
    };
  }

  // ---------- Angebotsvergleich (Vergleichsgruppen) ---------------------
  function compareGroups(data) {
    var groups = {};
    (data.offers || []).forEach(function (o) {
      var g = (o.compare_group || o.trade || 'ohne Gruppe').trim();
      (groups[g] = groups[g] || []).push(o);
    });
    return Object.keys(groups).map(function (k) {
      var offers = groups[k].slice().sort(function (a, b) { return n(a.gross) - n(b.gross); });
      var awarded = offers.find(function (o) { return low(o.status) === 'auftrag erteilt' || isTrue(o.final); });
      return { group: k, offers: offers, awarded: awarded, cheapest: offers[0], count: offers.length };
    });
  }

  // ---------- Finanzierung ----------------------------------------------
  function annuity(amount, annualRate, years) {
    if (!amount || !years) return 0;
    var r = annualRate / 100 / 12, m = years * 12;
    return r === 0 ? amount / m : amount * r / (1 - Math.pow(1 + r, -m));
  }
  function calcFinancing(data) {
    var budget = calcBudget(data);
    var t = budget.totals;
    var fin = data.financing || [];
    var subs = data.subsidies || [];

    // ---- Bedarf automatisch aus Kosten-Tab (max Schätzung/Ist) ----
    var bedarfGesamt = t.need, bedarfW1 = t.needW1, bedarfW2 = t.needW2;
    var planGesamt = t.plan, planW1 = t.planW1, planW2 = t.planW2;      // Kostenschätzung
    var istGesamt = t.ist, istW1 = t.istW1, istW2 = t.istW2;            // Ist-Kosten
    var paidGesamt = t.paid, paidW1 = t.paidW1, paidW2 = t.paidW2;

    function isType(f, keys){ return keys.some(function(k){ return low(f.type).indexOf(k)>=0; }); }
    function forParty(arr, p){ return arr.filter(function(f){ var pp=low(f.party); return pp===p || pp.indexOf(p)>=0; }); }
    function sumAmt(arr){ return arr.reduce(function(a,f){ return a+n(f.amount); },0); }

    // ---- Bausteine je Kategorie ----
    var ek = fin.filter(function(f){ return isType(f,['eigenkapital']); });
    var foerd = fin.filter(function(f){ return isType(f,['landesförd','landesfoerd','zuschuss']) || (isType(f,['förder','foerd']) && !isType(f,['darlehen','kredit','steuer'])); })
      .concat(subs.map(function(s){ return {party:s.party, amount:n(s.confirmed_amount)||n(s.expected_amount)||0, type:'Förderung', status:s.status, comment:(s.program||'')}; }));
    var zdl = fin.filter(function(f){ return isType(f,['zinsbeg','zdl']); });
    var kredit = fin.filter(function(f){ return isType(f,['kredit','bankkredit','restb']) && !isType(f,['zinsbeg','steuer','bonus','förder','foerd']); });
    var steuer = fin.filter(function(f){ return isType(f,['steuer','bonus']); });

    // ---- pro Wohnung zusammensetzen ----
    function baustein(arr, p){
      var rows = forParty(arr, p);
      return { sum: sumAmt(rows), rows: rows };
    }
    function rateOf(arr){
      return arr.reduce(function(a,f){ return a + annuity(n(f.amount), n(f.interest_rate)||0, n(f.term_years)||0); }, 0);
    }
    // Rückvergütung ZDL: ~1% p.a. des Betrags, max 2.400/Jahr, 10 Jahre
    function zdlRefund(arr){
      return arr.reduce(function(a,f){ return a + Math.min(n(f.amount)*0.01, 2400); }, 0);
    }

    function party(p, bedarf){
      var e = baustein(ek,p), fo = baustein(foerd,p), z = baustein(zdl,p), k = baustein(kredit,p), st = baustein(steuer,p);
      var deckung = e.sum + fo.sum + z.sum + k.sum;         // echte Finanzierungsquellen (Steuer NICHT, das ist Rückfluss)
      var luecke = Math.max(0, bedarf - deckung);
      var zRate = rateOf(z.rows), kRate = rateOf(k.rows);
      var refundA = zdlRefund(z.rows);                       // Rückvergütung/Jahr (ZDL)
      return {
        bedarf: bedarf,
        ek: e.sum, ekRows: e.rows,
        foerd: fo.sum, foerdRows: fo.rows,
        zdl: z.sum, zdlRows: z.rows, zdlRate: zRate, zdlRefundAnnual: refundA, zdlRefundTotal: refundA*10, zdlNetRate: zRate - refundA/12,
        kredit: k.sum, kreditRows: k.rows, kreditRate: kRate,
        steuer: st.sum, steuerRows: st.rows,
        deckung: deckung, luecke: luecke,
        rateBrutto: zRate + kRate, rateNetto: (zRate - refundA/12) + kRate
      };
    }

    var w1 = party('w1', bedarfW1);
    var w2 = party('w2', bedarfW2);
    // gemeinsame Bausteine (party = gemeinsam) anteilig? → als eigener Block ausweisen
    var gem = party('gemeinsam', 0);

    var gesamt = {
      bedarf: bedarfGesamt,
      ek: w1.ek + w2.ek + gem.ek,
      foerd: w1.foerd + w2.foerd + gem.foerd,
      zdl: w1.zdl + w2.zdl + gem.zdl,
      kredit: w1.kredit + w2.kredit + gem.kredit,
      steuer: w1.steuer + w2.steuer + gem.steuer,
      zdlRate: w1.zdlRate + w2.zdlRate + gem.zdlRate,
      kreditRate: w1.kreditRate + w2.kreditRate + gem.kreditRate,
      zdlRefundAnnual: w1.zdlRefundAnnual + w2.zdlRefundAnnual + gem.zdlRefundAnnual,
      zdlRefundTotal: w1.zdlRefundTotal + w2.zdlRefundTotal + gem.zdlRefundTotal
    };
    gesamt.deckung = gesamt.ek + gesamt.foerd + gesamt.zdl + gesamt.kredit;
    gesamt.luecke = Math.max(0, bedarfGesamt - gesamt.deckung);
    gesamt.rateBrutto = gesamt.zdlRate + gesamt.kreditRate;
    gesamt.rateNetto = gesamt.rateBrutto - gesamt.zdlRefundAnnual/12;

    return {
      // Gegenüberstellung Kosten (für Finanz-Tab)
      planGesamt:planGesamt, planW1:planW1, planW2:planW2,
      istGesamt:istGesamt, istW1:istW1, istW2:istW2,
      paidGesamt:paidGesamt, paidW1:paidW1, paidW2:paidW2,
      bedarfGesamt:bedarfGesamt, bedarfW1:bedarfW1, bedarfW2:bedarfW2,
      // Bausteine
      w1:w1, w2:w2, gem:gem, gesamt:gesamt,
      // Steuer separat gesamt
      steuerGesamt: gesamt.steuer,
      // legacy keys
      totalNeed: bedarfGesamt, equity: gesamt.ek, confirmedSubs: gesamt.foerd,
      confirmedLoans: gesamt.zdl + gesamt.kredit, paid: paidGesamt,
      gap: gesamt.luecke, gapW1: w1.luecke, gapW2: w2.luecke,
      totalRate: gesamt.rateNetto, totalRateW1: w1.rateNetto, totalRateW2: w2.rateNetto,
      reserve: 0
    };
  }


  // ---------- Projektampel (mehrdimensional) -----------------------------
  // Statt einer einzelnen Kennzahl: getrennte Ampeln fuer Zeit, Kosten,
  // Buerokratie/Genehmigungen und Vergabe/Ausschreibungen - jede mit
  // eigenem, nachvollziehbarem Kriterium.
  function calcAmpel(data) {
    var prog = calcProgress(data);
    var costs = calcCosts(data);
    var trades = data.trades || [];

    // Zeit: Aufgabenfortschritt vs. Zeitfortschritt bis Erstbezug
    var zeitLevel = prog.diff >= 0 ? 'gruen' : prog.diff >= -10 ? 'gelb' : 'rot';
    var zeit = { level: zeitLevel, label: prog.risk, detail: 'Aufgaben ' + pct(prog.taskProgress) + ' vs. Zeit ' + pct(prog.timeToOcc) };

    // Kosten: Prognose vs. grobe Baseline-Schaetzung (+ Reserve)
    var baselinePlusReserve = costs.baseline * 1.12;
    var costRatio = costs.baseline > 0 ? costs.forecast / baselinePlusReserve : 0;
    var kostenLevel = costRatio <= 1.0 ? 'gruen' : costRatio <= 1.1 ? 'gelb' : 'rot';
    var kosten = { level: kostenLevel,
      label: costRatio <= 1.0 ? 'im Rahmen der Grobschätzung' : costRatio <= 1.1 ? 'leicht über Grobschätzung' : 'deutlich über Grobschätzung',
      detail: 'Prognose ' + euro(costs.forecast) + ' vs. Baseline+Reserve ' + euro(baselinePlusReserve) };

    // Buerokratie/Genehmigungen: offene Blocker in Grundlagen/Buerokratie/Foerderung
    var bueroCats = ['CAT-GRUND', 'CAT-BUERO', 'CAT-FOERD'];
    var bueroBlockers = prog.blockers.filter(function (t) { return bueroCats.indexOf(t.category_id) >= 0 || ['grundlagen', 'buerokratie', 'foerderung', 'bürokratie'].indexOf(low(t.phase)) >= 0; });
    var openBlockers = bueroBlockers.length;
    var bueroLevel = openBlockers === 0 ? 'gruen' : openBlockers <= 2 ? 'gelb' : 'rot';
    var buero = { level: bueroLevel,
      label: openBlockers === 0 ? 'keine offenen Genehmigungs-Blocker' : openBlockers + ' offene Blocker',
      detail: bueroBlockers.slice(0, 3).map(function (t) { return t.task; }).join(', ') || '–' };

    // Vergabe/Ausschreibung: Anteil vergebener/beauftragter Gewerke
    var totalTrades = trades.length || 1;
    var awardedTrades = trades.filter(function (t) { return low(t.status).indexOf('beauftragt') >= 0 || low(t.status).indexOf('vergeben') >= 0; }).length;
    var openTrades = trades.filter(function (t) { return low(t.status).indexOf('ausschreibung') >= 0 || low(t.status) === 'offen'; }).length;
    var awardRatio = awardedTrades / totalTrades;
    var daysToBuild = prog.daysToBuild;
    var vergabeLevel = awardRatio >= 0.5 ? 'gruen' : (daysToBuild > 45 ? 'gelb' : 'rot');
    var vergabe = { level: vergabeLevel,
      label: awardedTrades + ' von ' + totalTrades + ' Gewerken vergeben',
      detail: openTrades + ' Ausschreibungen offen, ' + daysToBuild + ' Tage bis Baubeginn' };

    var levels = [zeit.level, kosten.level, buero.level, vergabe.level];
    var overall = levels.indexOf('rot') >= 0 ? 'rot' : levels.indexOf('gelb') >= 0 ? 'gelb' : 'gruen';

    return { zeit: zeit, kosten: kosten, buero: buero, vergabe: vergabe, overall: overall };
  }

  // ---------- Saldo zwischen W1 und W2 (wer hat für wen vorgestreckt) ----
  // Für jede bezahlte Ist-Position: Zahler trägt den vollen Betrag, geschuldet
  // ist aber nur der eigene Kostenschlüssel-Anteil. Differenz = Ausgleich.
  function calcSaldo(data) {
    var rows = [];
    var paidByW1 = 0, paidByW2 = 0, oweW1 = 0, oweW2 = 0;
    (data.cost_positions || []).filter(isActive).forEach(function (c) {
      var g = n(c.gross);
      var pa = n(c.paid_amount);
      if (pa <= 0 && (isTrue(c.paid) || low(c.status).indexOf('bezahlt') >= 0)) pa = g; // Altdaten
      if (pa <= 0) return;                                   // nur real bezahlte Beträge zählen für den Saldo
      var pb = low(c.paid_by || '');
      var payer = (pb.indexOf('ingrid') >= 0 || pb === 'w1') ? 'W1' : ((pb.indexOf('maxi') >= 0 || pb === 'w2') ? 'W2' : '');
      var frac = g > 0 ? Math.min(1, pa / g) : 1;
      var w1 = shareOf(c, 'w1') * frac, w2 = shareOf(c, 'w2') * frac;   // Schlüsselanteil auf den bezahlten Teil
      if (payer === 'W1') paidByW1 += pa; else if (payer === 'W2') paidByW2 += pa;
      oweW1 += w1; oweW2 += w2;
      rows.push({ item: c.item, gross: g, paid: pa, payer: payer, shareW1: w1, shareW2: w2, date: c.date, paidBy: c.paid_by });
    });
    var balanceW1 = paidByW1 - oweW1;
    var settle = balanceW1;
    return { paidByW1: paidByW1, paidByW2: paidByW2, oweW1: oweW1, oweW2: oweW2,
      balanceW1: balanceW1, settle: settle, rows: rows,
      direction: settle > 0.5 ? 'W2→W1' : (settle < -0.5 ? 'W1→W2' : 'ausgeglichen'),
      amount: Math.abs(settle) };
  }

  // ---------- Energie (dynamisch aus energy_inputs, formelbasiert) ------
  // overrides erlaubt Live-Schieberegler ohne Sheet-Schreibzugriff bei
  // jeder Bewegung: dieselbe Formel, nur mit temporär ersetzten Werten.
  function energyInputs(data) {
    var map = {};
    (data.energy_inputs || []).forEach(function (r) {
      var key = low(r.name).replace(/[^a-z0-9]+/g, '_');
      map[key] = { value: r.value, num: n(r.value), module: r.module, unit: r.unit, raw: r };
      if (r.input_id) map[low(r.input_id)] = map[key];
    });
    return map;
  }
  function pick(map, s, names, def) {
    for (var i = 0; i < names.length; i++) {
      var k = String(names[i]).toLowerCase().replace(/[^a-z0-9]+/g, '_');
      for (var mk in map) { if (mk.indexOf(k) >= 0) return map[mk].num; }
    }
    if (s && s[names[0]] != null) return n(s[names[0]]);
    return def == null ? 0 : def;
  }

  function calcEnergy(data, scenario, overrides) {
    var s = settingsObj(data);
    var m = energyInputs(data);
    scenario = scenario || 'Pellet + WP';
    overrides = overrides || {};
    function val(key, names, def) { return overrides[key] != null ? overrides[key] : pick(m, s, names, def); }

    var roofUsable = pick(m, s, ['nutzbare_dachflaeche', 'nutzbare dachfläche', 'pv_roof'], n(s.pv_roof_gross_sw) - n(s.pv_roof_deduction_obstacles) || 32);
    var density = pick(m, s, ['pv_leistungsdichte', 'pv_power_density'], n(s.pv_power_density) || 0.19);
    var yieldPerKwp = pick(m, s, ['pvgis_ertrag', 'pvgis'], n(s.pvgis_yield_per_kwp) || 1296.61);
    var maxKwp = roofUsable * density;
    var pvKwp = val('pvKwp', ['pv_leistung', 'pv_kwp'], maxKwp) || maxKwp;
    // Auto-Default wird auf Dachmaximum begrenzt; ein expliziter Override
    // (Schieberegler) darf das Dachmaximum bewusst überschreiten (Was-wäre-wenn).
    if (overrides.pvKwp == null && pvKwp > maxKwp) pvKwp = maxKwp;
    var pvAnnual = pvKwp * yieldPerKwp;

    var hhW1 = pick(m, s, ['haushaltsstrom_w1', 'haushalt_w1'], 2800);
    var hhW2 = pick(m, s, ['haushaltsstrom_w2', 'haushalt_w2'], 2700);
    var household = val('household', ['haushaltsstrom'], (hhW1 + hhW2) || 5500);
    var evCount = val('evCount', ['e_autos', 'ev_anzahl'], 1);
    var evPerCar = pick(m, s, ['ev_verbrauch', 'ev_kwh'], 2500);
    var ev = evCount * evPerCar;
    var cooling = pick(m, s, ['klima', 'kuehlstrom'], 380);
    var cop = pick(m, s, ['cop', 'jaz'], 3.6);
    var heatDemand = val('heatDemand', ['heizwaermebedarf', 'heizwärmebedarf'], 14000);
    var pelletShareDefault = scenario === 'nur WP' ? 0 : (scenario === 'winteroptimiert' ? 0.55 : pick(m, s, ['pelletanteil'], 0.35));
    var pelletShare = overrides.pelletShare != null ? overrides.pelletShare : pelletShareDefault;
    var wpHeat = heatDemand * (1 - pelletShare);
    var wpElec = wpHeat / cop;
    var pelletHeat = heatDemand * pelletShare;
    var pelletKg = pelletHeat / 4.8; // kWh/kg
    var battery = val('battery', ['batterie'], 12);

    var totalElec = household + ev + cooling + wpElec + 200;
    // Direktverbrauch + Batterie-Effekt (vereinfachtes Monatsmodell)
    var directFrac = 0.34, battFrac = clamp(Math.log1p(battery) * 0.09, 0, 0.30);
    if (scenario === 'autarkieoptimiert') battFrac = clamp(battFrac + 0.06, 0, 0.4);
    var selfUse = Math.min(pvAnnual * (directFrac + battFrac), totalElec);
    var autarky = clamp(selfUse / totalElec * 100, 0, 95);
    var grid = Math.max(0, totalElec - selfUse);
    var feedIn = Math.max(0, pvAnnual - selfUse);

    var elecPrice = val('elecPrice', ['strompreis'], 0.28);
    var feedPrice = pick(m, s, ['einspeise'], 0.08);
    var pelletPrice = pick(m, s, ['pelletpreis'], 0.34); // €/kg
    var energyCost = grid * elecPrice - feedIn * feedPrice + pelletKg * pelletPrice;

    var batteryRec = maxKwp < 6 ? '5–8 kWh' : maxKwp < 9 ? '8–12 kWh' : '10–14 kWh';

    return { scenario: scenario, usable: roofUsable, maxKwp: maxKwp, pvKwp: pvKwp, pvAnnual: pvAnnual,
      household: household, ev: ev, cooling: cooling, wpElec: wpElec, total: totalElec,
      pelletKg: pelletKg, pelletShare: pelletShare, wpCoverage: (1 - pelletShare) * 100, autarky: autarky, grid: grid, feedIn: feedIn,
      selfUse: selfUse, energyCost: energyCost, battery: battery, heatDemand: heatDemand, evCount: evCount, elecPrice: elecPrice,
      batteryRecommendation: batteryRec };
  }

  function scenarios(data) {
    return ['Pellet + WP', 'nur WP', 'autarkieoptimiert', 'winteroptimiert'].map(function (sc) { return calcEnergy(data, sc); });
  }

  function monthlyPV(data, overrides) {
    var e = calcEnergy(data, null, overrides);
    var shape = [4.6, 6.2, 9.1, 10.4, 11.6, 12.1, 12.4, 11.2, 9.0, 6.6, 4.4, 3.8]; // % je Monat ~ Summe 100+
    var sum = shape.reduce(function (a, b) { return a + b; }, 0);
    return shape.map(function (v) { return e.pvAnnual * v / sum; });
  }
  function monthlyLoad(data, overrides) {
    var e = calcEnergy(data, null, overrides);
    var shape = [11.5, 10.6, 9.2, 7.3, 6.4, 6.1, 6.3, 6.2, 6.6, 8.3, 10.4, 11.1];
    var sum = shape.reduce(function (a, b) { return a + b; }, 0);
    return shape.map(function (v) { return e.total * v / sum; });
  }

  window.HinterSunCalc = {
    euro: euro, num: n, pct: pct, settingsObj: settingsObj, clamp: clamp, shareOf: shareOf, splitPctOf: splitPctOf,
    calcProgress: calcProgress, calcBudget: calcBudget, calcCosts: calcCosts, calcEstimate: calcEstimate, calcActual: calcActual, compareGroups: compareGroups,
    calcFinancing: calcFinancing, calcAmpel: calcAmpel, calcSaldo: calcSaldo, calcEnergy: calcEnergy, scenarios: scenarios,
    monthlyPV: monthlyPV, monthlyLoad: monthlyLoad, annuity: annuity
  };
})();
