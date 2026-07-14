# Was ist neu (v4)

Umsetzung deiner Änderungswünsche. Jeder Punkt mit Fundort.

## Tabs neu geordnet
- **Entfernt:** „Dokumente" und „Szenarien & Entscheidungen".
- **Kosten in drei eigene Tabs aufgeteilt:**
  1. **Kostenschätzung** – grobe Erst-Schätzung (Baseline) + detailliertere Versionen, immer getrennt nach Wohnung 1 und 2, live gegen die Ist-Kosten abgeglichen (Δ-Spalte).
  2. **Kosten (Ist)** – tatsächliche Ausgaben mit Zahler, variablem Kostenschlüssel je Position und **Saldo zwischen W1 und W2**.
  3. **Finanzierung** – Eigenkapital, Förderung (Zuschuss + zinsbegünstigtes Darlehen), Kredit, Steuerabschreibungen (BonusCasa, EcoBonus, Möbelbonus, Solar).

## Grobkostenschätzung integriert (Bild 1)
Als Baseline eingepflegt, exakt wie in deiner Tabelle (Kubikmeterpreise, ±25 %):

| Position | Menge | Preis | Schätzung | Zuordnung |
|---|---|---|---|---|
| Abbrucharbeiten Bestand | psch. | – | 30.000 € | gemeinsam 46,6/53,4 |
| Umbauarbeiten Keller −1 | 325 m³ | 50 € | 16.250 € | gemeinsam |
| Umbauarbeiten Wohnung A (EG) | 240 m³ | 350 € | 84.000 € | **W1 / Ingrid** |
| Carport | psch. | – | 30.000 € | gemeinsam |
| Umbau/Neubau Wohnung B (OG) | 230 m³ | 850 € | 195.500 € | **W2 / Maximilian** |
| Neubau Wohnung B (DG) | 240 m³ | 850 € | 204.000 € | **W2 / Maximilian** |
| **Bausumme** | 710 m³ | | **559.750 €** | |
| Technikerspesen | 10 % | | 55.975 € | gemeinsam |
| Außengestaltung | 100 m² | 100 € | 10.000 € | gemeinsam |

Steuerabschreibungen (max. 133.500 €) und Landesförderung (PV+WP 50 %) sind im Finanzierungs-Tab hinterlegt.

## Getätigte Kosten integriert (Bild 2)
Alle 7 Ausgaben als Ist-Positionen – **mit Zahler und Kostenschlüssel je Punkt**:

| Datum | Betrag | Bezahlt von | Grund |
|---|---|---|---|
| 24.02.2026 | 16,00 € | Maximilian | Stempelmarke |
| 24.02.2026 | 100,00 € | Ingrid | Gemeinde – Durchführungsplan |
| 09.03.2026 | 32,00 € | Maximilian | 2× Stempelmarke |
| 10.03.2026 | 250,00 € | Maximilian | Gemeinde – Einreichprojekt |
| 22.04.2026 | 253,76 € | Ingrid | PSP 1. Termin (absetzbar) |
| 22.04.2026 | 22.204,00 € | Ingrid | Klement Einreichplanung (absetzbar) |
| 08.06.2026 | 16,00 € | Ingrid | Stempelmarke |

**Saldo automatisch berechnet:** Der Zahler trägt je Position zunächst den vollen Betrag, geschuldet ist nur der eigene Schlüssel-Anteil. Ergebnis aktuell: **Maximilian (W2) schuldet Ingrid (W1) 11.916 €**. Der Schlüssel ist pro Position frei einstellbar.

## Gewerke & Vergabe
Pro Gewerk werden alle Angebote verglichen; über **„vergeben"** wird ein Angebot final vergeben und automatisch als Auftrag in „Kosten (Ist)" übernommen. Pro Vergleichsgruppe bleibt genau ein aktiver Auftrag.

## Aufgabenverteilung vereinfacht
Entfernt: Gewicht, „Hängt ab von", „Blockiert", „Blocker". **Verantwortlich** ist jetzt ein Dropdown (Maximilian, Ingrid, gemeinsam, Architekt Klement, Statiker, Gemeinde, Notarin, Bank, Techniker, offen).

## Kategorien-Bug behoben
Neu angelegte Hauptkategorien bleiben jetzt erhalten – auch wenn das Backend sie im Moment des Speicherns noch nicht kennt. Sie werden lokal gepuffert und nach jedem Neuladen wieder eingefügt, bis der Sheet-Schreibvorgang klappt. **Wichtig:** einmalig das neue Backend bereitstellen und die Migration ausführen (siehe `SCHRITT_FUER_SCHRITT.md`), damit der Tab `task_categories` im Sheet existiert.

---
**Sheets werden nicht überschrieben:** Alle neuen Felder kommen additiv über die Migration dazu; bestehende Daten bleiben erhalten.
