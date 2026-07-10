---
title: ZEUS V1 – Token-Architektur für Theming-Fähigkeit
status: draft
note: Ergänzend zu ZEUS_V1_UI_UX_Fixes_Codex.md (Punkte 4/5 dort betreffen dieselben Dateien). Ziel ist ein tokens.css-Fundament, das spätere Themes und einen Obsidian-Farbimport ohne Grep durch alle CSS-Dateien erlaubt.
---

# ZEUS V1 – Token-Architektur für Theming-Fähigkeit

## Ausgangslage

`tokens.css` nutzt bereits bewusst Obsidians eigene Namenskonvention (`--background-primary/secondary/tertiary`, `--text-normal/muted/faint/strong`, `--interactive-accent`) – das ist die richtige Basis für spätere Obsidian-Kompatibilität. Das Problem liegt nicht in den Namen, sondern darin, dass das System nicht konsequent zu Ende gedacht ist: es gibt keinen Umschalt-Mechanismus, mehrere Farben haben keine `-rgb`-Zwillinge, und Component-CSS (`review.css`, `suggestions.css`, `layout.css`) schreibt an mehreren Stellen rohe Hex-/RGB-Werte statt Tokens. Aktuell ist Theme-Wechsel praktisch nicht möglich, ohne vier Dateien zu durchsuchen.

## Zielstruktur `tokens.css`

### 1. Primitive vs. Semantic Tokens trennen
Aktuell ist alles ein einziger `:root`-Block ohne Kommentar-Trennung. Vorschlag: zwei klar kommentierte Ebenen.

```css
/* === PRIMITIVES (Rohwerte, nie direkt in Components nutzen) === */
--amber-500: #f59e0b;
--amber-600: #d97706;
--neutral-950: #0a0a0a;
--neutral-900: #111111;
--green-600: #16a34a;
--red-600: #dc2626;
--orange-500: #fb923c;

/* === SEMANTIC (das nutzen Components) === */
--background-primary: var(--neutral-950);
--interactive-accent: var(--amber-600);
--status-success: var(--green-600);
```

Damit kann ein Theme später nur die Primitives austauschen, ohne jede semantische Zeile anzufassen.

### 2. `-rgb`-Zwilling für jede Farbe, die je mit Alpha genutzt wird
Aktuell existieren nur `--interactive-accent-rgb` und `--text-accent-rgb`. Fehlend, aber im Code bereits gebraucht (siehe Fix-Liste, Priorität 2, Punkt 4):

```css
--status-success-rgb: 22, 163, 74;
--status-danger-rgb: 220, 38, 38;
--status-warning-rgb: 251, 146, 60; /* aktuell nirgends als Token, nur als rohes #fb923c in suggestions.css */
```

Das ist der wichtigste einzelne Schritt – ohne das bleibt jede `rgba(34,197,94,...)`-Stelle in `review.css`/`suggestions.css` beim Theme-Wechsel stumm.

### 3. Geister-Tokens real definieren
`layout.css` referenziert `var(--action-context, #38bdf8)`, `var(--action-read, ...)`, `var(--action-write, ...)`, `var(--action-organize, #a78bfa)` – keine dieser Variablen ist in `tokens.css` tatsächlich definiert, es gibt nur die CSS-Fallback-Werte. Sieht aus wie ein Override-Punkt, ist aber keiner. Fix: alle vier als echte Tokens in `tokens.css` aufnehmen, Fallback in `layout.css` kann bleiben (schadet nicht), ist dann aber nicht mehr die einzige Quelle.

### 4. Theme-Wrapper-Grundgerüst, auch wenn V1 nur Dark hat
```css
body.theme-dark {
  /* aktueller :root-Inhalt wandert hierher */
}

body.theme-light {
  /* leer / TODO, erst wenn Appearance-Settings kommen */
}
```
Kostet jetzt fast nichts (reines Verschieben + ein Klassenname am `body`), verhindert aber einen deutlich teureren Umbau später, wenn schon 500+ Zeilen Component-CSS auf dem aktuellen `:root`-Modell aufbauen.

### 5. `--text-normal` vs. `--text-readable` vs. `--text-strong` klären
Drei sehr ähnliche Werte (`#e8e8e8`, `#dddddd`, `#ffffff`) ohne dokumentierten Unterschied. `--text-readable` wird aktuell nur in Markdown-Preview/-Editor genutzt – vermutlich bewusst leicht gedämpft für Lesetext vs. UI-Chrome. Entweder kurzer Kommentar dazu in `tokens.css`, oder falls kein bewusster Unterschied besteht: zusammenlegen.

## Migration der bestehenden Hardcode-Stellen

Deckt sich mit Fix-Liste (`ZEUS_V1_UI_UX_Fixes_Codex.md`), Priorität 2, Punkte 4 und 5 – nach dem Token-Ausbau oben einfach draufmappen:

- `review.css`: Diff-Zeilenfarben, Status-Dot-Farben je `data-status`
- `suggestions.css`: Score-Chip-Farben (`.is-score-green/yellow/orange/red`)
- `layout.css`: Action-Category-Border-Farben

## Obsidian-Theme-Kompatibilität – realistischer Scope

Ein fertiges Obsidian-Theme-CSS 1:1 laden wird **nicht** funktionieren, auch mit sauberen Tokens nicht: Obsidian-Themes stylen zusätzlich Obsidian-eigene DOM-Klassen (`.nav-file-title`, `.workspace-leaf`, `.markdown-source-view`, etc.), die es in ZEUS nicht gibt. "Ganzes Theme drop-in" wäre falsches Erwartungsmanagement.

Realistisch und mit der bestehenden Namenskonvention gut machbar: ein kleiner **Farb-Import-Adapter**, der aus einer Obsidian-Theme-CSS-Datei nur die Variablen ausliest, deren Namen sich mit den ZEUS-Semantic-Tokens decken (`--background-primary`, `--text-normal`, `--interactive-accent`, etc.), und diese in eine ZEUS-`tokens.css`-Variante überträgt. Alles, was ZEUS nicht kennt (Obsidian-spezifische Klassen), wird ignoriert statt zu crashen.

Grobe Umsetzung, sobald Punkt 1–5 oben stehen:

1. Parser liest die `:root`-Deklarationen der importierten CSS-Datei.
2. Nur Variablennamen übernehmen, die im ZEUS-Semantic-Layer existieren (Whitelist = die Namen aus Abschnitt "Semantic" oben).
3. Fehlende Variablen fallen auf die aktuellen ZEUS-Defaults zurück, kein halb-kaputtes Theme.
4. Ergebnis wird als eigener `body.theme-imported-<name>`-Block gespeichert, nicht der bestehende Dark-Wrapper überschrieben.

Das ist ein V1.1/V1.2-Feature, keine V1-Anforderung – aber der Grund, warum die Token-Arbeit oben (Punkt 1–5) sich lohnt, jetzt zu machen statt später: der Adapter wird nur trivial, wenn die Whitelist aus Schritt 2 sauber und vollständig ist. Nachträglich in einer gewachsenen Codebase mit verstreuten Hex-Werten wäre das deutlich mehr Aufwand.

## Empfohlene Reihenfolge

1. `tokens.css` nach Abschnitten 1–5 umbauen (kein Verhalten ändert sich, reines Fundament).
2. Fix-Liste Priorität 2 (Punkte 4/5) draufmappen – bestehende Hardcode-Stellen ersetzen.
3. `body.theme-dark`-Wrapper steht dann schon bereit für spätere Appearance-Settings.
4. Obsidian-Import-Adapter erst angehen, wenn V1 eingefroren ist und Punkt 1–3 stabil sind.

## Anhang: konkrete Fundstellen (Search & Replace für Codex)

Kein reines "fehlt als Token"-Problem, sondern echter Farbdrift: mehrere unterschiedliche Grün-/Rot-Töne, die alle dieselbe Bedeutung (Erfolg/Fehler) tragen sollen, aber im Detail unterschiedlich aussehen.

| Bedeutung | Wert | Fundstelle |
|---|---|---|
| Grün Nr. 1 | `#16a34a` (`--status-success`) | `tokens.css` |
| Grün Nr. 2 | `#9be29b` | `review.css` → `.review-diff-line-add` |
| Grün Nr. 3 | `#4ade80` | `review.css` → `[data-status="done"] .review-basket-item-status` |
| Grün Nr. 4 | `rgba(34,197,94,...)` (`#22c55e`) | `suggestions.css` → `.is-score-green` Border/Background |
| Rot Nr. 1 | `#dc2626` (`--status-danger`) | `tokens.css` |
| Rot Nr. 2 | `#ff9b9b` | `review.css` → `.review-diff-line-remove` |
| Rot Nr. 3 | `#f87171` | `review.css` → `[data-status="failed"]` |
| Rot Nr. 4 | `rgba(239,68,68,...)` (`#ef4444`) | `suggestions.css` → `.is-score-red` Border/Background |

Besonders inkonsistent: In `suggestions.css` nutzt `.is-score-green`/`.is-score-red` für die Textfarbe bereits `var(--status-success)`/`var(--status-danger)`, aber Border und Background daneben einen komplett anderen, hardcodierten Grün-/Rotton. Alle vier Varianten je Farbe sollten nach der Token-Erweiterung (Abschnitt "Zielstruktur", Punkt 2) auf `var(--status-success)` / `var(--status-success-rgb)` bzw. `var(--status-danger)` / `var(--status-danger-rgb)` vereinheitlicht werden.

Weitere konkrete Fundstellen:

- **`.suggestions-item-score.is-score-orange`** (`suggestions.css`) – vollständig hardcodiert (`#fb923c`), kein Token dahinter. Wird zu `var(--status-warning)` (siehe Abschnitt "Zielstruktur", Punkt 2).
- **`--action-context/read/write/organize`** (`layout.css`) – nur als Fallback-Hex in `var(--action-x, #hex)` vorhanden, nie echt definiert (Geister-Token, siehe Abschnitt "Zielstruktur", Punkt 3).
- **`.send-button-icon`, `.markdown-history-icon`** (`layout.css`, `markdown.css`) – Farbe per `filter: brightness(0) invert(1)` / berechneter `hue-rotate`-Kette statt `currentColor` (siehe Fix-Liste, Priorität 2, Punkt 7).
- **`.review-modal-overlay`** (`rgba(0,0,0,.68)`) und `.review-modal` Box-Shadow (`rgba(0,0,0,.45)`) (`review.css`) – niedrige Priorität, aber reines Schwarz-Overlay funktioniert in einem künftigen Light-Theme nicht gut. Erst relevant, wenn `body.theme-light` (Abschnitt "Zielstruktur", Punkt 4) tatsächlich befüllt wird.
