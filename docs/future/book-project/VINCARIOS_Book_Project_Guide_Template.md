---
title: PROJECT_GUIDE.md – Vorlage für vincarios Buchprojekte
status: draft
note: Das hier ist der INHALT, der bei Erstellung eines Buchprojekt-Presets automatisch als PROJECT_GUIDE.md in die Projekt-Root geschrieben wird. Reines Markdown, kein Code – die KI liest diese Datei als Kontext vor jedem Schreib-Vorschlag. Platzhalter in {geschweiften Klammern} werden beim Preset-Setup ausgefüllt oder vom Autor manuell angepasst.
---

# {Buchtitel} – Projektleitfaden

Diese Datei ist die zentrale Referenz für vincarios beim Arbeiten an diesem Buchprojekt. vincarios liest sie vor jedem Vorschlag für neue Szenen, Charakter-Updates oder Lore-Ergänzungen. Halte sie aktuell – vincarios schlägt Aktualisierungen selbst vor, wenn sich Fakten in Kapiteln ändern, aber du entscheidest über jede Änderung im Review Basket.

## Projektstruktur

```
{Buchtitel}/
├── PROJECT_GUIDE.md          ← diese Datei
├── Charaktere/                ← ein Sheet pro Figur
├── Orte/                      ← ein Sheet pro Schauplatz
├── Lore/                      ← Weltgeschichte, Regeln, Hintergrund (nur bei Bedarf gezogen)
├── Kapitel/
│   ├── 01_Kapitelname.md
│   ├── 02_Kapitelname.md
│   └── ...
└── Stand/                      ← "Stand"-Notizen, nach jedem Kapitel aktualisiert
    ├── Stand_Hauptfigur.md
    └── ...
```

## Stil & Ton (statisch, immer im Kontext)

Halte diesen Abschnitt bewusst kurz – er wird bei jeder Anfrage mitgeladen, nicht nur bei Bedarf.

- **Erzählperspektive:** {z. B. Dritte Person limitiert, Ich-Erzähler}
- **Zeitform:** {z. B. Präteritum}
- **Tonfall:** {z. B. nüchtern-melancholisch, humorvoll-leicht, düster}
- **Zielgruppe:** {z. B. Erwachsene, New Adult}
- **No-Gos:** {z. B. keine Kapitelenden mit Cliffhanger, kein Kopfhüpfen innerhalb einer Szene}
- **Vorbilder/Referenzen:** {optional, z. B. "Ton ähnlich wie ..."}

## Charakter-Sheet-Format

Jede Datei in `Charaktere/` folgt diesem Frontmatter-Schema, damit vincarios sie zuverlässig einliest:

```yaml
---
name: {Vollständiger Name}
rolle: {Protagonist / Antagonist / Nebenfigur}
wesenszuege: {3-5 Stichpunkte}
sprachduktus: {wie die Figur spricht/denkt}
beziehungen:
  - "[[Andere Figur]]": {Kurzbeschreibung der Beziehung}
aktueller_stand: {ein Satz, wird nach jedem Kapitel aktualisiert}
---
```

Kurz halten (Zielgröße: 200–300 Wörter Fließtext zusätzlich zum Frontmatter). Tiefere Hintergrundgeschichte gehört nach `Lore/`, verlinkt per `[[...]]`, nicht in das Sheet selbst.

## Orts-Sheet-Format

```yaml
---
name: {Ortsname}
typ: {Stadt / Gebäude / Region / ...}
atmosphaere: {2-3 Stichpunkte}
verknuepfte_figuren:
  - "[[Figur]]"
---
```

## Verlinkung – die Grundregel

Jede Szene, die eine Figur oder einen Ort erwähnt, verlinkt diese explizit per `[[Name]]`. vincarios liest beim Schreiben einer neuen Szene automatisch die Outgoing-Links der aktuellen Kapitel-Notiz und zieht die verlinkten Charakter-/Ort-Sheets als Kontext – aber nur, wenn dafür Lesezugriff besteht. Ohne Verlinkung sieht vincarios die Notiz nicht automatisch.

## Stand-Notizen

Nach jedem abgeschlossenen Kapitel aktualisiert vincarios (als Vorschlag, mit Diff-Preview im Review Basket) die betroffenen `Stand/Stand_{Figur}.md`-Dateien:

```yaml
---
figur: "[[Figur]]"
letztes_kapitel: {Kapitelnummer}
emotionaler_stand: {kurz}
offene_fäden: {was noch aufgelöst werden muss}
wissensstand: {was die Figur zu diesem Zeitpunkt weiß/nicht weiß}
---
```

Diese Datei – nicht die komplette Kapitelhistorie – ist die primäre Quelle für "wo steht diese Figur gerade", wenn vincarios eine neue Szene mit ihr schreibt.

## Arbeitsweise mit vincarios

1. Du wählst/öffnest die Kapitel-Notiz, an der du arbeitest.
2. vincarios liest deren Links, holt die verlinkten Charakter-/Ort-/Stand-Notizen (nur mit bestehender Leseberechtigung).
3. vincarios schlägt Text vor – landet als Vorschlag, nicht als direkte Änderung.
4. Nach Bestätigung: Diff-Preview im Review Basket, du entscheidest final.
5. vincarios schlägt optional Stand-Notiz-Updates vor, wieder mit eigenem Diff-Preview.

## Änderungsprotokoll dieses Guides

| Datum | Änderung |
|---|---|
| {Datum} | Projekt angelegt |

