# Umbau Hintersun 8 – Projekt-Cockpit

Dashboard für den Hausumbau: Kosten, Angebote/Aufträge, Finanzierung, Zeitplan (Gantt), Energie und Entscheidungen – für die zwei Wohnungen W1 und W2. GitHub Pages + Google Apps Script + Google Sheets.

**→ Einrichtung: siehe [`SCHRITT_FUER_SCHRITT.md`](SCHRITT_FUER_SCHRITT.md).** Erst Backend bereitstellen, dann `docs/` auf GitHub ersetzen.
**→ Neu in dieser Version: siehe [`NEU_IN_V4.md`](NEU_IN_V4.md)** (Kosten in 3 Tabs, Saldo W1/W2, Vergabe der Gewerke, Grobkostenschätzung + Ist-Ausgaben integriert, vereinfachte Aufgaben).
**→ Ganz neues GitHub-Projekt aufsetzen: siehe [`NEUES_GITHUB_PROJEKT.md`](NEUES_GITHUB_PROJEKT.md).**

## Struktur
- `docs/` – die Website (GitHub Pages). `docs/assets/js/config.js` enthält die bestehende Web-App-URL.
- `google-apps-script/Code.gs` – Backend (Web App). Enthält Menü „Umbau H8 Backend" mit Setup + Migration.
- `google-sheets/` – CSV-Startdaten und XLSX-Vorlage des Backends.
- `data/` – Schema und Beispieldaten.

## Bedienung in Kürze
Jede Tabelle hat oben rechts **+ Anlegen**, jede Zeile **✎ Bearbeiten** und **🗑 Löschen**. Änderungen gehen sofort ins Google Sheet. Angebote werden über **Auftrag erteilen** zu aktiven Kosten – pro Vergleichsgruppe genau ein aktiver Auftrag.
