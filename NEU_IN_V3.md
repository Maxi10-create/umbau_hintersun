# Was ist neu (v3) – deine Wünsche, umgesetzt

Alle Punkte aus deiner Nachricht, jeweils mit Fundort im Dashboard.

## 1. Unterlagen eingearbeitet
Aus deiner ZIP habe ich die projektrelevanten Dokumente ausgewertet und als echte Daten eingepflegt – nicht nur verlinkt, sondern als Kosten, Angebote, Zahlungen, Termine und Parameter:

- **Architektenhonorar Klement** 36.000 € + 4 % + MwSt → als Auftrag; erste Rechnung (Fattura 2604: Durchführungsplanänderung 4.900 € + Einreichprojekt 12.600 €, brutto 22.204 €) als Zahlung vom 27.04.2026.
- **Statik Manuel Troger** 3.700 € netto (Ausführungsstatik 1.800 + statische Bauleitung 1.900) → als Auftrag.
- **Küche**: Resch (22.442 € netto / 27.378 € brutto) und Stampfl (25.900 € netto / 31.598 € brutto) als **zwei Angebote in einer Vergleichsgruppe** – zählen nicht doppelt, du erteilst den Auftrag per Klick.
- **Steuerberatung PSP** (erste Rechnung 253,76 €), **Gemeindegebühren** (100 € + 250 €), **Stempelmarken** (16/32/16 €) als Zahlungen.
- **Termine** aus Status Architekt/Bürokratie: Erstbesprechung, Durchführungsplan, Einreichung, Bausitzung 28.04., Bank-/Wohnbauamt-/Notartermine, Unbedenklichkeitserklärung, EEVE, Förderantrag, Baubeginn.
- **Tausendstel** 466/534 (W1/W2) aus der signierten Tabelle vom 04.06.2026.
- **Technik**: PV-Ertrag PVGIS, Pelletkessel (Guntamatic 10,2 kW, 92,8 %), Alperia-Strompreise, Klimazone F.

> Bewusst **nicht** übernommen: reine Personendokumente (Ausweise, Steuer-/Vermögensbescheide, IBAN/Bankdaten) – die gehören nicht ins Projekt-Dashboard.

## 2. Getrennte Kosten W1 / W2 – deutlich sichtbar
- Auf der **Überblick-Seite**: die Kosten-Kachel zeigt jetzt direkt „W1 … · W2 …".
- Unter **Kosten**: eigene zweifarbige Karte „W1 / Ingrid" (Lehm) vs. „W2 / Maximilian" (Schiefer).
- Die **Budgetblock-Tabelle** hat zwei eigene Spalten W1 und W2 je Block.
- Jede **Kostenposition** zeigt ihren W1- und W2-Anteil in Euro.
- Aufteilung bleibt frei editierbar (Vorlagen 46,6/53,4 · 50/50 · 100/0 · 0/100, mit Live-Summenprüfung).

## 3. Aufgaben: Zuteilung + Beschreibung → Timeline
- Jede Aufgabe hat jetzt **Verantwortlich**, **Beschreibung** und **Hauptkategorie**.
- Beschreibung und Zuteilung erscheinen in der Aufgabenliste und beim Klick auf den Zeitstrahl.

## 4. Ursprüngliche Kostenschätzung + laufender Abgleich
- Die grobe Erstschätzung (620.000 € Rohbau/Hauptgewerke, aufgeteilt W1 160.000 / W2 460.000; 29.000 € Innenausbau) liegt als **Baseline** vor.
- Die Budgettabelle zeigt **Baseline → aktuelle Schätzung → beauftragt → bezahlt → Prognose → Δ zur Baseline**. Der Abgleich ist immer live.
- Detailliertere Schätzungen trägst du als **neue Version** ein (Reiter „Kostenschätzungen"), die Baseline bleibt als Referenz stehen. Alles editierbar.

## 5. Projektampel neu gedacht
Statt einer einzigen, wenig aussagekräftigen Zahl gibt es jetzt **vier getrennte Ampeln** mit je eigenem, nachvollziehbarem Kriterium:
- **Zeit** – Aufgabenfortschritt vs. Zeitfortschritt bis Erstbezug
- **Kosten** – Prognose vs. Grobschätzung + Reserve
- **Bürokratie** – offene Genehmigungs-Blocker (Notar, Unbedenklichkeit, EEVE, Förderantrag …)
- **Vergabe** – Anteil vergebener Gewerke vor Baubeginn

Darüber eine Gesamt-Ampel (rot, wenn irgendeine Dimension rot ist).

## 6. Zeitplan: Termine vs. Dauer + Hauptkategorien
- **Termine** (fixes Datum) erscheinen als **Raute ◆**, **Vorgänge** (mit Dauer) als **Balken ▬** – klar unterscheidbar.
- Aufgaben sind in **Hauptkategorien** gruppiert (Swimlanes): Grundlagen, Bürokratie, Planung, Ausschreibung, Bau, Förderung.
- Kategorien sind **selbst erstellbar und farblich** einstellbar (Reiter „Hauptkategorien" – Name, Farbe, Reihenfolge).
- Filter nach Kategorie / nur Termine / nur Vorgänge / nur kritisch. Heute-Linie, Baubeginn- und Erstbezug-Marker, kritischer Pfad.

## 7. Energie & Technik: live, mit Schiebereglern, formelbasiert
- Eigener **Schieberegler-Bereich**: PV-Leistung, Batterie, Pelletanteil, Heizwärmebedarf, E-Autos, Haushaltsstrom, Strompreis.
- Alles rechnet **live und formelbasiert** (PVGIS-Ertrag, COP/JAZ, Direktverbrauch + Batteriemodell, Autarkie, Netzbezug, Einspeisung, Energiekosten). Auch die Diagramme aktualisieren sich sofort.
- „Zurücksetzen" stellt die Ausgangswerte wieder her. Dauerhaft speichern über die Tabelle „Energieparameter".

> Hinweis: Die Energie-Rechnung ist ein sauberes, aber vereinfachtes Monatsmodell als **Richtwert** für Entscheidungen (PV-Größe, Batterie, Pellet vs. WP) – keine Ingenieur-Auslegung.

---

**Wichtig zur Einrichtung:** Beim ersten Start das Backend einmal migrieren (siehe `SCHRITT_FUER_SCHRITT.md`, Schritt A3). Dabei entstehen die neuen Tabs `task_categories` und `budget_estimates` samt Standard-Kategorien.
