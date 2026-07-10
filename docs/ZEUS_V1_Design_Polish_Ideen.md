---
title: ZEUS V1 – Design & Polish Ideen (nicht V1-kritisch)
status: draft
note: Ergänzend zu ZEUS_V1_UI_UX_Fixes_Codex.md. Diese Liste enthält keine Bugs oder Architekturverstöße, sondern optionale visuelle Verbesserungen. Nicht mit der Fix-Liste vermischen – erst nach den P1-P3 Fixes dort einordnen/priorisieren.
---

# ZEUS V1 – Design & Polish Ideen

Ziel: ZEUS soll aussehen wie eine "teure" lokale Desktop-App (Linear/Arc/Raycast-Liga), nicht wie generisches SaaS-Dashboard-Bling. Alle Punkte respektieren das bestehende Amber/Ember-Farbschema (`tokens.css`) und den Not-V1-Scope aus dem Product Brief (kein Theme-Builder, keine Spielereien).

Einordnung pro Punkt: **V1** (passt in aktuellen Scope, geringer Aufwand) oder **V1.1-Kandidat** (Scope-Risiko, erst nach Freeze-Review einordnen).

---

## Schnelle Wins

### 1. Ember-Glow bei aktiven Elementen
- **Scope:** V1
- **Ziel:** Selektierte File-Tree-Row, aktiver Suggestion-Item, aktiver Workspace-Tab bekommen zusätzlich zum Border einen sanften Glow: `box-shadow: 0 0 12px rgba(var(--interactive-accent-rgb), .25);`
- **Warum:** Nutzt das vorhandene Amber-Farbschema und den Zeus/Blitz-Namensbezug, ohne neue Assets.

### 2. Subtile Noise-Textur auf dem Hintergrund
- **Scope:** V1
- **Datei:** `tokens.css` / `layout.css`, `--background-primary`
- **Ziel:** Inline-SVG `feTurbulence`-Overlay bei ca. 2–3% Opacity als `background-image` auf `body` oder `.app-shell`. Reines Flat-Black wirkt sonst schnell billig.
- **Aufwand:** gering, keine neue Abhängigkeit.

### 3. Score-Ring statt Text-Pill
- **Scope:** V1
- **Dateien:** `suggestions.css` (`.suggestions-item-score`), Similar-Notes-Ergebnisliste in `mountSelectionActions.js`
- **Ziel:** Kompaktes SVG-Donut mit Fill-Prozentsatz statt farbiger Text-Badge für Match-Prozentwerte.
- **Aufwand:** mittel (kleine SVG-Komponente + Prozent-zu-Stroke-Berechnung), aber wiederverwendbar für alle Score-Anzeigen.

### 4. Folder-Role-Farbpunkte im File Tree
- **Scope:** V1
- **Datei:** vermutlich `files.css` (nicht geprüft, siehe Fix-Liste P1 #3)
- **Ziel:** Jeder Vault-Profile-Rollenordner (Inbox/Projects/Knowledge/Archive/Brain) bekommt einen winzigen farbigen Dot/Tint im File Tree.
- **Warum:** Macht Vault-Struktur auf einen Blick lesbar, zahlt direkt auf "ZEUS macht Organisation sichtbar" ein. Sollte mit der Permission-Farbgebung (Fix-Liste P1 #3) abgestimmt werden, damit sich Rollen-Dot und R/W-Badge nicht farblich überschneiden.

### 5. Accent-Flash bei geänderten Dateien
- **Scope:** V1
- **Datei:** File-Tree-Row-Rendering (Datei nicht hochgeladen)
- **Ziel:** Nach erfolgreichem `update_note` blitzt die betroffene Zeile im File Tree kurz in Akzentfarbe auf (Fade über ~400–600ms).
- **Warum:** Räumliches Feedback "das hat sich gerade geändert", ohne dass man den Status-Bar-Text lesen muss. Passt zum Safety-First-Vertrauensaufbau des Produkts.

### 6. Icons für Settings-Kategorien
- **Scope:** V1
- **Datei:** Settings-Panel-Modul (nicht hochgeladen)
- **Ziel:** Providers → Plug, Limits → Gauge, Safety → Shield, Embeddings → Sparkles, Vault Profile → FolderTree (alle aus der bereits vorhandenen Lucide-Icon-Registry).
- **Aufwand:** gering, reine Wiederverwendung vorhandener Icons.

---

## Größere Swings

### 7. "Local Only"-Trust-Badge im Topbar
- **Scope:** V1
- **Datei:** `mountShell.js` (`.topbar-actions`, neben `#provider-status`)
- **Ziel:** Permanent sichtbares kleines Lock- oder Haus-Icon mit Tooltip "Runs 100% local", direkt neben dem Provider-Status-Pill.
- **Warum:** Das ist das Kern-Differenzierungsmerkmal gegenüber Obsidian Copilot/Smart Connections – aktuell nur in den Docs erwähnt, nirgends in der UI zelebriert. Kostet fast nichts, wirkt aber wie Trust-Signal und Marketing gleichzeitig.

### 8. Command Palette (Ctrl+K)
- **Scope:** V1.1-Kandidat
- **Ziel:** Schnellzugriff auf Selection Actions, Dateien, Settings über Tastatur, aufbauend auf der bestehenden Action-Registry (`actionRegistry.js`).
- **Warum zurückgestellt:** Passt inhaltlich gut zur "deterministische App-Aktionen statt Prompt-Raten"-Philosophie, ist aber laut Product Brief Scope-Creep-Risiko für V1 ("codebase small enough that a new developer can understand the main flow in one session"). Erst nach dem V1-Freeze-Review (Phase 7.7) neu bewerten.

### 9. Skeleton-Loading statt Spinner
- **Scope:** V1
- **Dateien:** `layout.css` (`.chat-message-pending`), Suggestions-/Embeddings-Ladezustände
- **Ziel:** Schimmernde Platzhalter-Items statt reinem Kreis-Spinner, während lokale Inferenz läuft.
- **Warum:** Bei einer App, die öfter auf lokale Modelle wartet als Cloud-Tools, wirkt das deutlich hochwertiger und verringert gefühlte Wartezeit.

### 10. Eigene Display-Schrift für den Start-Screen-Titel
- **Scope:** V1.1-Kandidat
- **Datei:** `layout.css` (`.start-screen h1`)
- **Ziel:** Eigene Display-Schrift nur für "ZEUS Agent" auf dem Start-Screen, Inter bleibt überall sonst.
- **Warum zurückgestellt:** Neue Schrift bedeutet neuen Lizenzprozess – Inter + Lucide sind laut Implementation Plan (Phase 6) gerade erst mit Lizenznachweis abgeschlossen worden. Nur aufnehmen, wenn der Aufwand das Ergebnis klar rechtfertigt.

---

## Priorisierungsvorschlag
Wenn nur Zeit für 2–3 Punkte ist: **#7 (Trust-Badge)** zuerst, weil es Produktidentität direkt sichtbar macht, dann **#1 (Ember-Glow)** und **#6 (Settings-Icons)** als günstige Konsistenz-Wins.
