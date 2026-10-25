# Zielarchitektur – Umbau Hintersun 8 (Projekt-Cockpit)

## Zweck
Planung und Steuerung des Umbaus für die Wohnungen W1 und W2: Kostenschätzung, Angebote und Vergabe, Finanzierung und Förderungen, Zeitplan (Gantt), Energie, Entscheidungen.

## Abgrenzung zu den anderen Systemen

| System | Rolle |
|---|---|
| **Umbau-Cockpit** (dieses Repo) | Planung: Soll-Kosten, Angebote, Vergabe, Termine, Finanzierungsplan |
| **Finanz-App** (`finanz-app_V2`) | Erfassung der tatsächlichen Zahlungen (Ist) inkl. Kredit-Ereignisse |
| **Hausbau-App** (PersonalAI, `localhost:8000/hausbau/`) | Auswertung; liest Zahlungen aus der Finanz-App |

Zahlungen werden nur in der Finanz-App erfasst. Das Cockpit führt keine eigenen Ist-Zahlungen mehr, sobald der Abgleich Soll/Ist über die Hausbau-App läuft.

## Systemübersicht

```
┌──────────────────────────┐  GET readAll / read / health   ┌──────────────────────┐   ┌──────────────────┐
│ Dashboard (GitHub Pages) │ ─────────────────────────────▶ │ Apps Script Web-App  │──▶│ Google Sheet     │
│ index.html + assets/     │  POST append/upsert/… + Token  │ apps_script/Code.gs  │   │ 23 Tabs + Audit  │
└──────────────────────────┘ ◀──────────── JSON ─────────── └──────────────────────┘   └──────────────────┘
```

| Schicht | Technik | Verantwortung |
|---|---|---|
| Frontend | Vanilla JS, ein Script je Aufgabe | UI, Formulare, Berechnungen, Gantt, Charts |
| API | Apps Script, `BACKEND_VERSION` 6.3.3 | generisches CRUD je Tab, `awardOffer`, Audit-Log |
| Daten | Google Sheet | Tabs laut `SHEET_ORDER`, Schema in `data/schema.json` |

### Frontend-Module (`assets/js/`)
| Datei | Aufgabe |
|---|---|
| `config.js` | API-URL, Token, Projektdaten |
| `data-adapter.js`, `store.js` | Backend-Zugriff, Zustand |
| `calculations.js` | Kosten, Saldo W1/W2, Finanzierung |
| `forms.js` | Anlegen/Bearbeiten/Löschen |
| `gantt.js`, `charts.js` | Visualisierung |
| `sample-data.js` | Offline-Fallback |
| `app.js` | Start, Navigation |

## Sicherheit – Ist und Ziel
**Ist:** Lesen (`readAll`) ist ohne Anmeldung möglich. Schreiben ist nur geschützt, wenn `WRITE_TOKEN` gesetzt ist; ohne Token ist alles offen. Ein Token im öffentlichen Frontend wäre zudem für jeden sichtbar.

**Ziel:**
1. Login mit Session-Token wie in der Finanz-App (`Security.gs`): Lesen und Schreiben nur angemeldet.
2. Repo **privat** (enthält Namen, Tausendstel, Eigenkapital, Firmen).
3. Echtdaten aus `sample-data.js`, `data/` und Seed-Daten in `Code.gs` entfernen, nur anonymisierte Beispiele behalten.

## Repo-Struktur

```
umbau_hintersun/
├─ index.html              Website (Pages: main / root)
├─ assets/{css,js}/
├─ apps_script/Code.gs
├─ data/
│  ├─ schema.json
│  ├─ sample-data.json
│  └─ sheet-vorlage/       XLSX + CSV-Startdaten
├─ docs/                   Anleitungen, changelog/
├─ manifest.json           Projekt-Metadaten
├─ ARCHITECTURE.md
└─ README.md
```

## Konventionen
- `BACKEND_VERSION` bei jeder Backend-Änderung erhöhen; Frontend zeigt sie unten links.
- Nach Frontend-Änderungen Hard Reload (Strg + Shift + R).
- Keine Echtdaten neu einchecken.

## Zielzustand (offene Schritte)
| # | Schritt | Nutzen |
|---|---|---|
| 1 | Repo privat, Login nach Finanz-App-Muster | Datenschutz |
| 2 | Echtdaten aus Repo entfernen | Datenschutz |
| 3 | Ist-Zahlungen (`payments`, `cashflow`) aus Finanz-App beziehen statt doppelt pflegen | eine Quelle der Wahrheit |
| 4 | `Code.gs` (≈4.300 Zeilen) aufteilen: `Schema.gs`, `Crud.gs`, `Seed.gs`, `Setup.gs` | Wartbarkeit |
| 5 | Apps Script per `clasp` deployen | reproduzierbare Deploys |
| 6 | Klären, ob das Cockpit langfristig in die Hausbau-App (PersonalAI) aufgeht | ein System statt zwei |
