# JTech Browser

Ein gaming-orientierter Desktop-Browser auf Basis von **Electron 45** (Chromium),
mit Fokus auf ein vollständig anpassbares Interface.

## Aktueller Stand

- Mehrere Tabs mit Favicon, Titel, Ladeindikator und Schließen-Button
- Adress- und Suchleiste (URL-Erkennung, **Google** als Standard-Suche)
- Navigation: Zurück, Vorwärts, Neu laden, Stoppen
- Fehlerseite im Browser-Look statt Chromium-Fehlercode
- Frameless Glas-UI mit eigener Titlebar, Fenstersteuerung und animiertem Hintergrund
- Startseite (`jtech://newtab`) mit Uhr, Suche und Shortcut-Hinweisen
- **Einstellungs-Menü** (`Ctrl+,`): Suchmaschine, Tab-Layout, Favoriten, Über
- **Horizontale oder vertikale Tabs** (Seitenleiste links, live umschaltbar)
- **Favoritenleiste** mit Stern-Button, Verwaltung und automatischem Speichern
- **Design-Studio**: Theme-Editor mit Reitern, Live-Vorschau, 12 Presets, Hintergrund-Animationen, Style-Aspekten (Clean, Animated, Gaming, Minimal), Glow-Steuerung und automatischem Speichern
- Konfigurierbare Hotkeys über `settings.json`
- Neue Tabs bei `target="_blank"` / `window.open`

## Starten

```powershell
npm install
npm start
```

Mit geöffneten Chrome-DevTools (UI-Debugging):

```powershell
npm run dev
```

Tests ausführen:

```powershell
npm test
```

## Design-Studio

Über den Regler-Button rechts in der Toolbar (neben den DevTools) öffnet sich das
Design-Studio. Während es offen ist, wird die aktive Webseite ausgeblendet, damit
das Studio den gesamten Bereich unter der Chrome-Leiste nutzen kann.

Der Editor ist in Reiter organisiert:

| Reiter | Inhalt |
| --- | --- |
| **Farben** | Akzentfarben, Hintergrund, Textfarben |
| **Oberfläche** | Glas-Deckkraft, Blur, Radius, Rahmen, Schatten, Sättigung, Rahmenstil |
| **Hintergrund** | Wallpaper-URL oder Animation (Orbs, Partikel, Wellen, Mesh, Rauschen) mit Geschwindigkeit und Intensität |
| **Stil** | Browser-Stil (Standard, Aufgeräumt, Animation, Gaming, Minimal), Glow-Stärke, Übergangsgeschwindigkeit, Schriftart und -größe |
| **Erweitert** | Eigenes CSS für Chrome-UI und Startseite |

Anpassbar sind unter anderem:

| Bereich | Werte |
| --- | --- |
| Akzentfarben | Hex-Farbe (Color-Picker oder Textfeld) |
| Hintergrund | Hex-Farbe + optionale Animation |
| Glas-Deckkraft | 20 – 95 % |
| Weichzeichnen | 0 – 60 px |
| Eckenradius | 0 – 28 px |
| Glow-Stärke | 0 – 100 % |
| Übergangs-/Animationsgeschwindigkeit | 0 – 200 % |

Änderungen werden sofort auf Chrome-UI und Startseite angewendet und nach 250 ms
automatisch gespeichert. 12 Presets (z. B. Obsidian, Ember, Arctic, Cyber,
Minimal) setzen alle Werte auf einmal. „Zufällig“ erzeugt ein zufälliges
Farb-/Style-Setup. Themes lassen sich importieren und exportieren.
„Auf Standard zurücksetzen“ stellt das Obsidian-Theme wieder her. **Esc** oder
ein Klick außerhalb schließt das Studio.

## Standard-Hotkeys

| Aktion              | Tasten                    |
| ------------------- | ------------------------- |
| Neuer Tab           | `Ctrl+T`                  |
| Tab schließen       | `Ctrl+W`                  |
| Tab wieder öffnen   | `Ctrl+Shift+T`            |
| Adressleiste        | `Ctrl+L`, `Alt+D`         |
| Neu laden           | `Ctrl+R`, `F5`            |
| Hart neu laden      | `Ctrl+Shift+R`, `Ctrl+F5` |
| Zurück / Vorwärts   | `Alt+←` / `Alt+→`         |
| Nächster / letzter  | `Ctrl+Tab` / `Ctrl+Shift+Tab` |
| Einstellungen       | `Ctrl+,`                  |
| DevTools            | `F12`, `Ctrl+Shift+I`     |

## Einstellungen

Das Einstellungs-Menü öffnet sich über das Zahnrad in der Toolbar, die
Seitenleiste oder `Ctrl+,`. Änderungen werden automatisch nach 250 ms gespeichert
und sofort angewendet. Wie das Design-Studio liegt es als Overlay unter der
Chrome-Leiste; die aktive Webseite wird währenddessen ausgeblendet.

| Bereich | Optionen |
| --- | --- |
| Allgemein | Google, DuckDuckGo, Bing, Ecosia, Startpage, Brave oder benutzerdefinierte Such-URL |
| Darstellung | Horizontale Tab-Leiste oder vertikale Tab-Seitenleiste, Favoritenleiste ein/aus |
| Favoriten | Aktuelle Seite hinzufügen, Einträge öffnen und entfernen |
| Über | Version und Speicherort der Einstellungen |

Benutzerdefinierte Such-URLs müssen mit `http(s)://` beginnen und `%s` als
Platzhalter für die Suchanfrage enthalten. Favoriten akzeptieren nur
`http(s)`-URLs, werden dedupliziert und sind auf 100 Einträge begrenzt.

Beim ersten Start wird eine `settings.json` im Benutzerdaten-Ordner angelegt:

```
%APPDATA%\JTech Browser\settings.json
```

Existiert noch eine alte `%APPDATA%\Pulse\settings.json`, wird sie beim ersten
Start automatisch als Basis übernommen. Ältere Dateien ohne `search.engine`
werden auf Google migriert.

```json
{
  "search": {
    "engine": "google",
    "urlTemplate": "https://www.google.com/search?q=%s"
  },
  "ui": {
    "tabLayout": "horizontal",
    "favoritesBar": true
  },
  "favorites": [],
  "theme": {
    "accent": "#22d3ee",
    "accentAlt": "#a855f7",
    "bg": "#05060a",
    "glass": 0.58,
    "blur": 22,
    "radius": 13
  },
  "hotkeys": {
    "newTab": ["Ctrl+T", "Ctrl+Shift+N"]
  }
}
```

Alle Werte werden im Main-Prozess validiert (`normalizeSearch`, `normalizeUi`,
`normalizeFavorites`, `normalizeTheme`), bevor sie gespeichert oder angewendet
werden. Hotkeys sind Arrays von Accelerators wie `"Ctrl+Shift+T"`.

## Projektstruktur

```
src/
├─ main/
│  ├─ main.js       Fenster, IPC, Protokoll (jtech://), Shortcut-Routing
│  ├─ tabs.js       TabManager: eine WebContentsView pro Tab, Theme-/Such-Injektion
│  ├─ config.js     settings.json laden/speichern, Suche, Layout, Favoriten
│  └─ shortcuts.js  Accelerator-Parser und Matching
├─ preload/
│  └─ preload.js    schmale contextBridge-API (window.jtech)
└─ renderer/
   ├─ index.html    Browser-Chrome (Titlebar, Tabs, Toolbar) + Overlays
   ├─ newtab.html   Startseite (jtech://newtab)
   ├─ styles/       theme.css (Design-Tokens) + app.css
   └─ js/app.js     Tabs, Omnibox, Layout, Favoriten, Settings, Design-Studio
tests/
├─ shortcuts.test.js  Hotkey-Engine
├─ settings.test.js   Suche, Layout und Favoriten
└─ theme.test.js      Theme-Validierung
```

## Architektur-Entscheidungen

- **WebContentsView statt `<webview>`**: moderne, empfohlene Variante.
  Jeder Tab ist ein eigener Renderer-Prozess, das Chrome-UI läuft getrennt davon.
- **Frameless Window**: eigene Titlebar, dafür volle Kontrolle über Optik.
  Chrome-Höhe und Sidebar-Breite werden per `ResizeObserver` (plus expliziten
  Updates bei Layout-Wechseln) an den Main-Prozess gemeldet, damit die
  Content-Views pixelgenau daneben/darunter sitzen.
- **Overlay statt eigenem Fenster**: Design-Studio und Einstellungen liegen im
  Chrome-Renderer. Die aktive `WebContentsView` wird über `ui:overlay` temporär
  entfernt, damit das Overlay sichtbar ist – ohne zusätzliches Fenster.
- **Sicherheit**: `contextIsolation` + `sandbox` aktiv, kein Node im Renderer,
  nur eine minimale IPC-API. Im Omnibox werden nur `http(s)`-URLs zugelassen.
- **Theming & Suche**: alle Farben, Radien und Blur-Werte liegen als CSS-Variablen
  vor. Studio und Einstellungen schreiben live und persistieren über IPC.
  Startseiten erhalten Theme und Such-URL per `executeJavaScript` injiziert.

## Nächste Schritte (Roadmap)

1. **Hotkey-Editor**: Rebinding inkl. Konflikt-Erkennung und Aufzeichnung
2. **Eigene Presets**: Design-Studio-Setups benennen und speichern
3. **Gaming-Features**: RAM/CPU-Anzeige, Resource-Limiter, Force-Dark-Mode
4. **Verlauf & Lesezeichen-Suche** mit Filterung
5. **Sidebar** mit Schnellzugriff-Kacheln / Discord / Twitch
6. **Tab-Drag & Drop**, Tab-Kontextmenü, Session-Restore
7. **Auto-Updater & Installer** (electron-builder)
