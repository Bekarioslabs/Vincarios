---
title: vincarios V1.1 – Buchprojekt-Feature (technische Spec)
status: draft
scope: V1.1-Kandidat, nicht Teil des laufenden V1-Fix-Passes
note: Ergänzt VINCARIOS_Book_Project_Guide_Template.md (der Inhalt) um die technische Umsetzung. Kein Plugin-System, kein neuer Vertrauens-Layer – nutzt ausschließlich bestehende vincarios-Mechanismen (Template/Preset-Logik, Review Basket, Read-Permissions, runReadContextPreflight).
---

# vincarios V1.1 – Buchprojekt-Feature: Technische Spec

## Zusammenfassung

Drei Bausteine, unterschiedlich groß:

1. **Buchprojekt-Preset** – nutzt die bereits im Product Brief vorgesehene "Create new notes and projects through deterministic template/preset logic". Kein neuer Code-Pfad, ein neues Preset.
2. **PROJECT_GUIDE.md als Kontext-Quelle** – reiner Inhalt (siehe `VINCARIOS_Book_Project_Guide_Template.md`), kein Code-Aufwand.
3. **Link-Following für automatischen Kontext** – der einzige tatsächlich neue Code-Baustein.

Alle Schreiboperationen laufen weiterhin durch den bestehenden Review-Basket-Proposal-Mechanismus – kein privilegierter Schreibpfad für dieses Feature.

---

## 1. Buchprojekt-Preset

**Wo:** Bestehende Preset/Template-Logik (Ort im Code nicht Teil der hochgeladenen Dateien – vermutlich im selben Modul wie andere `create_from_template`-Presets, siehe `mountReviewBasket.js`, das den Proposal-Typ `create_from_template` bereits kennt).

**Was es tut:**
- Legt beim Anlegen eines neuen Buchprojekts die Ordnerstruktur an (`Charaktere/`, `Orte/`, `Lore/`, `Kapitel/`, `Stand/`).
- Schreibt eine initiale `PROJECT_GUIDE.md` in die Projekt-Root, befüllt mit den Platzhaltern aus dem Guide-Template (Buchtitel, Datum).
- Läuft wie jedes andere `create_from_template`-Preset durch den Review Basket (Plan-Preview vor Anlegen), inklusive des bereits vorhandenen "Edit"-Buttons für Template-Pläne aus `mountReviewBasket.js` (`renderEditButton`, `formatTemplatePlanPreview`).

**Aufwand:** gering – ein neues Template-Set in der bestehenden Preset-Registry, keine neue UI, kein neuer Proposal-Typ nötig (nutzt `create_from_template`, das schon existiert).

---

## 2. PROJECT_GUIDE.md als Kontext-Quelle

Kein Code-Feature im engeren Sinn. Sobald ein Buchprojekt aktiv ist (d. h. der Nutzer arbeitet an einer Notiz innerhalb des Projektordners), wird `PROJECT_GUIDE.md` als zusätzlicher, immer eingebundener Kontext an den `runReadContextPreflight`-Mechanismus übergeben, den `mountChat.js` bereits nutzt.

**Konkret:** In `runProviderRequest` (`mountChat.js`) bzw. in `buildOutboundMessages` müsste geprüft werden, ob die aktuell aktive Notiz innerhalb eines Ordners mit einer `PROJECT_GUIDE.md` in der Root liegt. Falls ja, wird deren Inhalt vor die eigentliche Anfrage gehängt – analog zu einem System-Prompt-Zusatz, nicht als weitere Chat-Nachricht sichtbar.

**Wichtig:** Guide-Datei selbst unterliegt denselben Read-Permissions wie jede andere Notiz. Kein Sonderfall, keine Bypass-Logik.

---

## 3. Link-Following für automatischen Kontext (der neue Teil)

### Problem
`mountChat.js` hat aktuell `runReadContextPreflight` mit Scope-Requests (Ordner-weiter Read-Zugriff auf Anfrage), aber kein automatisches Auflösen von Wikilinks innerhalb einer bereits gelesenen Notiz.

### Vorschlag: Link-Resolver-Modul

Neues, eigenständiges Modul (folgt dem bestehenden `window.VincariosX`-Muster, siehe `mountShell.js`s `mountOptional`-Aufrufe), z. B. `window.VincariosLinkResolver`.

**Funktion `resolveOutgoingLinks(noteContent, currentPath, permissions)`:**
1. Parst `noteContent` per Regex auf `[[Wikilink]]`-Syntax (einfacher Regex reicht für V1.1, kein vollständiger Markdown-AST nötig).
2. Löst jeden gefundenen Link zu einem Dateipfad relativ zur Vault auf (gleiche Auflösungslogik, die vermutlich schon für den Klick auf Links in der Markdown-Preview existiert, siehe `.markdown-wikilink` in `markdown.css` – dort passiert die Auflösung offenbar schon beim Rendern, sollte wiederverwendet statt neu gebaut werden).
3. Für jeden aufgelösten Pfad: Read-Permission-Check gegen das bestehende Permission-System (`files.css` zeigt `.file-permission-button.is-active`/`.is-inherited` – die zugrunde liegende Permission-Logik muss hier abgefragt werden, nicht dupliziert).
4. Gibt zwei Listen zurück: `{ readable: [...Pfade], blocked: [...Pfade] }`.

**Integration in den Chat-Flow:**
- Vor `runProviderRequest`: wenn die aktive Notiz Teil eines Buchprojekts ist, `resolveOutgoingLinks` aufrufen.
- `readable`-Notizen werden automatisch zum Kontext hinzugefügt (mit einem Hop-Limit, empfohlen: 1 Hop – nicht rekursiv den ganzen Graphen durchlaufen, sonst explodiert der Kontext trotz allem).
- `blocked`-Notizen (Link vorhanden, aber keine Read-Permission): analog zum bestehenden `scopeActions`-Muster in `appendPreflightResult` (`mountChat.js`) eine Nachricht mit Handlungsoption anzeigen, z. B. "Diese Szene verlinkt auf 'Charakter X', wofür keine Leseberechtigung besteht. Zugriff gewähren?" – nutzt exakt das bestehende Scope-Request-UI-Pattern, keine neue UI-Komponente.

**Aufwand:** mittel. Kernarbeit ist der Permission-Check-Reuse und die Entscheidung, wo der Hop-Limit sitzt – nicht der Regex-Parser selbst.

---

## 4. Stand-Notiz-Updates als Proposal

Kein neuer Proposal-Typ zwingend nötig – kann als normaler `update_note`-Proposal auf die jeweilige `Stand/Stand_{Figur}.md`-Datei laufen, exakt durch dieselbe Diff-Preview-Pipeline wie in `mountReviewBasket.js` (`confirmUpdateNote`, `renderDiffButton`) bereits vorhanden.

Einzige Ergänzung: vincarios müsste nach einer abgeschlossenen Kapitel-Schreibsession proaktiv vorschlagen, welche Stand-Notizen betroffen sein könnten (basierend auf den in der Szene vorkommenden `[[Links]]`) – das ist ein Prompting-/Skill-Thema (siehe Guide-Text "Arbeitsweise mit vincarios"), kein zusätzlicher Code-Mechanismus.

---

## Was explizit NICHT gebaut wird

- Kein generisches Plugin-API, keine Sandbox, kein Manifest-System (bleibt Not-V1 laut Product Brief).
- Kein neuer Schreibpfad außerhalb des Review Basket.
- Keine externen MCP-Server oder Cloud-Abhängigkeiten.
- Kein rekursiver Graph-Traversal ohne Hop-Limit (Kontext-Explosionsrisiko).
- Keine Sonderrechte für Buchprojekt-Notizen gegenüber dem bestehenden Permission-System.

## Offene Fragen für Codex / vor Umsetzung zu klären

- Wo genau lebt die bestehende Link-Auflösungslogik, die schon für `.markdown-wikilink`-Klicks in der Preview verwendet wird? Sollte wiederverwendet, nicht dupliziert werden.
- Wo lebt die Permission-Check-Funktion, die hinter `.file-permission-button.is-active/.is-inherited` steckt? Gleiches Reuse-Prinzip.
- Hop-Limit-Standardwert (Vorschlag: 1, konfigurierbar später) – finale Entscheidung vor Implementierung.

## Empfohlene Reihenfolge

1. Buchprojekt-Preset (geringer Aufwand, sofort nutzbar auch ohne Link-Following – Nutzer kann Struktur schon manuell befüllen).
2. PROJECT_GUIDE.md-Einbindung in den Kontext.
3. Link-Resolver-Modul, zuletzt, weil es von den bestehenden Auflösungs-/Permission-Funktionen abhängt, die zuerst lokalisiert werden müssen.
