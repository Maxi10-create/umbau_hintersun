# Umbau Hintersun 8 – Projekt-Cockpit

Dashboard für den Hausumbau: Kosten, Angebote/Aufträge, Finanzierung, Zeitplan (Gantt), Energie und Entscheidungen – für die zwei Wohnungen W1 und W2. GitHub Pages + Google Apps Script + Google Sheets.

Architektur: [`ARCHITECTURE.md`](ARCHITECTURE.md) · Einrichtung: [`docs/SCHRITT_FUER_SCHRITT.md`](docs/SCHRITT_FUER_SCHRITT.md) · Neues Repo: [`docs/NEUES_GITHUB_PROJEKT.md`](docs/NEUES_GITHUB_PROJEKT.md) · Versionshinweise: [`docs/changelog/`](docs/changelog/)

## Struktur
| Pfad | Inhalt |
|---|---|
| `index.html`, `assets/` | Website (GitHub Pages, Quelle `main` / `(root)`); `assets/js/config.js` enthält die Web-App-URL |
| `apps_script/Code.gs` | Backend (Web App), Menü „Umbau H8 Backend“ mit Setup + Migration |
| `data/` | Schema, Beispieldaten, Sheet-Vorlage (`sheet-vorlage/`: XLSX + CSV-Startdaten) |
| `docs/` | Anleitungen und Versionshinweise |

## Bedienung in Kürze
Jede Tabelle hat oben rechts **+ Anlegen**, jede Zeile **✎ Bearbeiten** und **🗑 Löschen**. Änderungen gehen sofort ins Google Sheet. Angebote werden über **Auftrag erteilen** zu aktiven Kosten – pro Vergleichsgruppe genau ein aktiver Auftrag.
