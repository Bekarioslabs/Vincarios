---
title: ZEUS V1 – UI/UX Fix-Liste für Codex
status: draft
source: Gemini-Vorschläge (gemini_ui_ux_vorschläge.md) + Claude Code-Audit gegen ZEUS_V1_IMPLEMENTATION_PLAN.md / ZEUS_V1_UI_AND_WORKFLOWS.md / tokens.css / layout.css / markdown.css / review.css / suggestions.css / mountShell.js / mountSelectionActions.js / mountSuggestionsWorkspace.js
---

# ZEUS V1 – UI/UX Fix-Liste für Codex

Regel: nur Punkte, die gegen den tatsächlichen Code geprüft wurden. Punkte, die auf nicht hochgeladenen Dateien beruhen (`mountReviewBasket.js`, `mountPaneResize.js`, `mountChat.js`, `files.css`), sind als **Verify first** markiert – erst den Ist-Zustand in der jeweiligen Datei prüfen, bevor etwas geändert wird (Doku-muss-Code-widerspiegeln-Regel).

---

## Priorität 1 – Bugs / Architekturverstoß gegen eigene Docs

### 1. Scroll-Overflow in Review/Context Basket
- **Dateien:** `review.css` (`.review-basket-items`), `layout.css` (`.context-basket-items`, `.workspace-stack`)
- **Problem:** `ZEUS_V1_UI_AND_WORKFLOWS.md` schreibt explizit vor, dass Scroll lokal bleiben muss ("Scroll should be local to file tree, selection actions, Markdown preview, chat history, and review basket"). Aktuell haben `.review-basket-items` und `.context-basket-items` kein `max-height`/`overflow`. `.workspace-stack` nutzt `grid-template-rows: minmax(240px,1fr) auto auto auto` – bei vielen offenen Items wachsen die `auto`-Rows unbegrenzt und können Input-Feld/Send-Button aus dem sichtbaren Bereich drücken.
- **Fix:** `.review-slot` und `.context-slot` bekommen ein sinnvolles `max-height` (z. B. `30vh`/`180px`) mit eigenem `overflow-y: auto` auf `.review-basket-items` / `.context-basket-items`, analog zu `.chat-log`.

### 2. Cancel ohne Bestätigung verwirft Text
- **Datei:** `mountSelectionActions.js`, Funktion `renderUpdateInstructionForm`
- **Problem:** `cancel.addEventListener('click', () => form.remove());` löscht den `textarea`-Inhalt sofort, ohne Rückfrage.
- **Fix:** Vor `form.remove()` prüfen, ob `textarea.value.trim()` nicht leer ist; wenn ja, `window.confirm('Eingabe verwerfen?')` (oder äquivalentes In-App-Modal statt nativem confirm, falls das Team das bevorzugt).

### 3. Permission-Visualisierung (direct/inherited/off) – Verify first
- **Datei:** vermutlich `files.css` (nicht hochgeladen)
- **Problem:** `ZEUS_V1_UI_AND_WORKFLOWS.md` fordert drei visuell unterscheidbare R/W-Zustände: direct = voller Akzent, inherited = heller, off = inaktiv. In keiner der hochgeladenen CSS-Dateien existiert dafür eine Klasse.
- **Fix:** Erst `files.css` und die File-Tree-Row-Markup prüfen. Falls die drei Zustände fehlen: `--permission-direct`, `--permission-inherited`, `--permission-off` Token-Varianten einführen (auf Basis von `--interactive-accent`) und auf die R/W-Badges anwenden. Sicherheitsrelevantester Punkt der Liste – zuerst bearbeiten, sobald die Datei vorliegt.

---

## Priorität 2 – Token-Konsolidierung (CSS-Architektur)

### 4. Status-RGB-Tokens einführen
- **Dateien:** `tokens.css`, `review.css`, `suggestions.css`
- **Problem:** `--interactive-accent-rgb` und `--text-accent-rgb` existieren bereits als Muster, aber `--status-success`, `--status-danger` haben keine `-rgb`-Variante. Stattdessen stehen rohe RGB-Werte verstreut in `review.css` (`rgba(22,163,74,.2)`, `rgba(220,38,38,.2)`) und `suggestions.css` (`rgba(34,197,94,.45)`, `rgba(239,68,68,.45)`, `rgba(251,146,60,.45)`).
- **Fix:** In `tokens.css` ergänzen: `--status-success-rgb`, `--status-danger-rgb`, `--status-warning-rgb` (für den Orange-Ton `#fb923c`/`251,146,60`, aktuell nirgends als Token definiert). Alle Fundstellen in `review.css`/`suggestions.css` darauf umstellen.

### 5. Diff-Farben im Review-Basket auf Tokens umstellen
- **Datei:** `review.css` (`.review-diff-line-add`, `.review-diff-line-remove`)
- **Problem:** Hardcodierte `#9be29b`, `#ff9b9b`, `rgba(60,180,90,.1)`, `rgba(220,70,70,.1)` – ausgerechnet im sicherheitskritischsten Screen (Diff-Review vor Write).
- **Fix:** Auf `var(--status-success)` / `var(--status-danger)` plus die neuen `-rgb`-Tokens aus Punkt 4 umstellen.

### 6. Border-Radius vereinheitlichen
- **Dateien:** `tokens.css`, alle vier CSS-Dateien
- **Problem:** Radien schwanken unkoordiniert zwischen 4px, 5px, 6px, 7px, 8px, 999px.
- **Fix:** `--radius-sm: 4px`, `--radius-md: 6px`, `--radius-lg: 8px` in `tokens.css`, dann konsequent anwenden. `999px` (Pills) bleibt eigener Fall, kein Token nötig.

### 7. Icon-Filter-Hack ersetzen
- **Dateien:** `layout.css` (`.send-button-icon`, inkl. `[data-chat-state="running"]`-hue-rotate-Kette), `markdown.css` (`.markdown-history-icon`)
- **Problem:** Icons werden per `filter: brightness(0) invert(1)` bzw. berechneter `hue-rotate`-Kette eingefärbt – funktioniert nur für das aktuelle Dark-Theme. `ZEUS_V1_UI_AND_WORKFLOWS.md` plant Appearance-/Theme-Settings (Phase 6.5) – das bricht dann sofort.
- **Fix:** Icons als Inline-SVG mit `fill="currentColor"` einbinden statt als gefilterte `<img>`, Farbe dann über `color` am Elternelement steuern.

### 8. `--transition-fast` einführen
- **Dateien:** `tokens.css`, alle interaktiven Elemente (Buttons, Links)
- **Problem:** Keine einzige Transition-Variable vorhanden, Hover-Wechsel wirken abrupt.
- **Fix:** `--transition-fast: 0.15s ease-in-out;` in `tokens.css`, global auf `background-color`, `border-color`, `color` bei `button`, `.left-button`, `.selection-action-button`, etc. anwenden.

### 9. Firefox-Scrollbar ergänzen
- **Datei:** `layout.css`
- **Problem:** `::-webkit-scrollbar` ist bereits vollständig gestylt (Zeile 27–39) – das war in Geminis Liste ein Fehltreffer. Was fehlt: `scrollbar-width: thin;` und `scrollbar-color: var(--background-modifier-border) transparent;` für Firefox.
- **Fix:** Beide Properties zu `html`/`body` oder global ergänzen.

---

## Priorität 3 – Sichtbares Feedback / Micro-UX

### 10. `.is-soft-disabled` visuelles Signal
- **Datei:** `layout.css` (`.selection-action-button.is-soft-disabled`)
- **Problem:** Aktuell nur `opacity: .48; cursor: help`. Nutzer sieht nicht sofort, dass R/W fehlt.
- **Fix:** Gestrichelter linker Rand oder kleines Schloss-Icon (Lucide `lock`) neben dem Label, wenn `aria-disabled="true"` gesetzt ist.

### 11. Empty States mit Icon
- **Dateien:** `mountSuggestionsWorkspace.js` (`.suggestions-workspace-empty`), `mountSelectionActions.js` (`.selection-actions-empty`), `mountShell.js` (`.mini-panel-empty`, `.chat-empty-state`)
- **Problem:** Reine Text-Divs.
- **Fix:** Flexbox-Layout mit passendem Lucide-Icon (leerer Ordner / Checkliste) + `var(--text-muted)`-Text. Icon-Registry (`iconRegistry.js`) ist laut Doku schon vorhanden – nur nutzen.

### 12. Destruktive Buttons erkennbar machen
- **Dateien:** `review.css` (`.review-clear-button`), `layout.css` (`.context-clear-button`)
- **Problem:** `Clear pending` / `Clear executed` / `Clear all` sehen wie neutrale Aktionen aus.
- **Fix:** `.button-danger`-Klasse: Hover-Zustand mit `var(--status-danger)`-Rand/Hintergrund. Nur auf `Clear pending`/`Clear all` anwenden (nicht auf `Clear executed`, da dort nichts Offenes verloren geht – Risikostufe unterscheiden).

### 13. `::selection` Theming
- **Datei:** `tokens.css` oder `layout.css`
- **Problem:** Kein Override, Textmarkierung erscheint im nativen OS-Blau.
- **Fix:** `::selection { background: rgba(var(--interactive-accent-rgb), .3); color: inherit; }`

### 14. Zeichenlimit-Anzeige im Update-Instruction-Feld
- **Datei:** `mountSelectionActions.js` (`renderUpdateInstructionForm`)
- **Problem:** Backend hat laut Implementation Plan (Phase 6) bereits Max-Size-Guards, UI zeigt aber kein Limit an – Fehler kommt erst nach dem Request.
- **Fix:** Kleiner Zähler unter dem Textarea (`x / 4000 Zeichen` o. ä.), Grenze aus denselben Settings/Limits ziehen, die der Guard nutzt.

---

## Priorität 4 – Verify first (Datei fehlt, erst Ist-Zustand prüfen)

### 15. Modal-Overlay-Klickschutz
- **Datei:** `mountReviewBasket.js` (nicht hochgeladen)
- Prüfen: schließt ein Klick auf `.review-modal-overlay` aktuell das Modal? Falls ja: nur noch explizite Buttons sollen schließen, Klick auf Overlay per `event.stopPropagation()` abfangen.

### 16. Focus-Trap für Modals
- **Datei:** `mountReviewBasket.js`
- Prüfen, ob Tab-Fokus während offenem Modal auf den Hintergrund springen kann. Falls ja: `inert`-Attribut auf den Hintergrund-Container oder einfachen Focus-Trap ergänzen. Laut Implementation Plan war bereits ein Accessibility-Pass (Phase 6) gelaufen – Modal-Focus-Trap wird dort nicht explizit erwähnt, also vermutlich noch offen.

### 17. Esc schließt Modal / Ctrl+Enter sendet Formular
- **Dateien:** `mountReviewBasket.js`, `mountSelectionActions.js`
- Prüfen, ob Keyboard-Shortcuts schon existieren. Falls nicht: `Esc` schließt offenes Modal, `Ctrl+Enter`/`Cmd+Enter` sendet Chat- und Update-Instruction-Textareas ab.

### 18. Double-Submit-Schutz beim Execute-Button
- **Datei:** `mountReviewBasket.js`
- Hinweis: Im Update-Instruction-Formular besteht **kein** Double-Submit-Risiko (Form wird synchron vor dem async Call entfernt). Der reale Kandidat ist der `Execute selected`-Button, der vermutlich mehrere Proposals sequenziell abarbeitet. Prüfen, ob der Button während der Ausführung disabled + in einen Ladezustand versetzt wird.

### 19. Chat-Input Auto-Grow
- **Datei:** `mountChat.js` (nicht hochgeladen)
- `ZEUS_V1_UI_AND_WORKFLOWS.md` beschreibt Auto-Grow bereits als Ist-/Zielverhalten. Erst prüfen, ob der `input`-Listener existiert, bevor etwas gebaut wird – sonst Doku-Code-Widerspruch klären statt einfach neu implementieren.

### 20. Pane-Resize Stabilität
- **Datei:** `mountPaneResize.js` (nicht hochgeladen)
- `layout.css` hat bereits den CSS-Hook `body.is-resizing .pane-resizer::after`. Prüfen, ob die Klasse `is-resizing` tatsächlich bei `mousedown`/`mouseup` gesetzt/entfernt wird – falls ja, ist der Punkt vermutlich schon gelöst.

---

## Nicht übernommen (bereits umgesetzt oder falsch eingeschätzt)

- **Inline-Code-Highlighting** – bereits vorhanden in `markdown.css` (`.markdown-preview code`) und `layout.css` (`.chat-message-markdown code`), jeweils mit eigenem Hintergrund + Border.
- **Webkit-Scrollbar** – bereits global gestylt in `layout.css`; nur Firefox-Fallback fehlt (siehe P2 #9).
- **Context Basket optische Zurückstufung** – bereits umgesetzt via `background: var(--background-subtle)` auf `.context-slot`.
