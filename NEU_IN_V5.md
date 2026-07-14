# Was ist neu (v5) – Daten aus dem alten Google Sheet übernommen

Du hast das alte Backend-Sheet (`Umbau_Hintersun_8_Backend.xlsx`) hochgeladen. Alle Positionen daraus sind jetzt eingearbeitet – **nichts geht verloren**. Deine live gepflegten Daten haben Vorrang; die v4-Neuerungen liegen additiv darüber.

## Vollständig übernommen aus deinem alten Sheet
- **33 Aufgaben** inkl. deiner neuesten Einträge: Klimahausberechnung, Steuerunterstützung, Sicherheitskoordination, Erhaltungszustand-Aufnahme, alle Bank-/Notar-/EEVE-Termine, Ausschreibungen. (Jeder Aufgabe wurde automatisch eine Hauptkategorie + Typ Termin/Vorgang zugeordnet, damit der Gantt farbig funktioniert.)
- **21 Firmen** mit deinen Kandidatenlisten je Gewerk (Felderer/Widmann/Arnold/Salcher Bau, Wolf/TipTop/Südtirol Fenster, Silgoner/Bodner/Oberrauch/Brugger, usw.).
- **11 Gewerke** mit Prioritäten und Baustart-Blockern.
- **13 Dokumente**, **7 Entscheidungen** (Treppe, EG-Fenster, Lüftung, WP, PV, Batterie, Küche).
- **4 Techniker** (Klement, Troger, Diego Consalvo, PSP/Obwexer).
- **9 Kostenpositionen**, **4 Angebote** (Resch/Stampfl/Klement/PSP) + **4 Angebotspositionen**, **4 Zahlungen**.
- **Finanzierung, Förderungen, Bankangebote, Energie-Parameter, Bürокratie, Cashflow, Settings, Parteien, Flächen** – komplett übernommen.

## Additiv ergänzt (aus v4, ohne deine Daten zu überschreiben)
- **Grobkostenschätzung** als Baseline (dein `budget_estimates` war leer) – die Bau-Positionen aus deiner Tabelle mit W1/W2-Zuordnung.
- **Stempelmarken** (16/32/16 €) als Ist-Positionen mit Zahler und Kostenschlüssel, damit der **Saldo W1/W2** rechnet.
- **6 Hauptkategorien** für den Zeitplan (farbig).
- Angebot **Statik Troger** ergänzt; **Steuerabschreibungen** (BonusCasa, EcoBonus, Möbelbonus, Solar) im Finanzierungs-Tab.

## Wichtig für die Übernahme ins echte Sheet
Deine bestehenden Daten im Google Sheet bleiben beim Update erhalten. Die Migration ist **nicht-destruktiv**:
- Sie ordnet nur Spalten neu / ergänzt fehlende (z. B. `paid_by`, `task_type`, `category_id`, `comment`).
- Sie legt die 6 Kategorien und die Grobkostenschätzung **nur an, wenn die jeweiligen Tabs noch leer sind** – deine Einträge werden nie überschrieben.

Ablauf wie gehabt (Details in `SCHRITT_FUER_SCHRITT.md`): erst `Code.gs` als „Neue Version" bereitstellen, dann im Sheet **Migration ausführen**, dann `docs/` auf GitHub austauschen und mit Strg+Shift+R neu laden.

> Hinweis: In der Fallback-Ansicht (ohne Backend) zeigt das Dashboard genau diese zusammengeführten Daten. Sobald das Backend verbunden ist, kommen die Live-Daten direkt aus deinem Sheet.
