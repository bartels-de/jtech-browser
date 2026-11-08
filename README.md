# JTech Browser

Ein gaming-orientierter Desktop-Browser auf Basis von **Electron 45** (Chromium),
mit Fokus auf ein vollständig anpassbares Interface.

## Funktionen (v0.7.0)

**Tabs & Navigation**
- Vertikale Tabs in der Seitenleiste (Breite per Ziehen anpassbar)
- Tab-Gruppen mit Farben, Anheften, Stummschalten, Duplizieren, Tab-Kontextmenü
- Split-View (zwei Tabs nebeneinander, Verhältnis einstellbar)
- Tab-Suche (`Ctrl+Shift+A`) und Command-Palette (`Ctrl+K`)
- Session-Restore beim Start, zuletzt geschlossene Tabs wieder öffnen
- Adress- und Suchleiste mit Vorschlägen aus offenen Tabs, Lesezeichen und Verlauf
- **JTech Bangs**: `!yt`, `!yt-d`, `!g`, `!ddg`, `!gh` sowie eigene Bangs – in Adressleiste und Startseite
- Zoom pro Website (wird gespeichert), Suchen auf der Seite, Drucken, Vollbild
- Fehlerseite im Browser-Look statt Chromium-Fehlercode

**Medien & Gaming**
- Media-Hub: alle laufenden Videos/Audios mit Play/Pause, Spulen, Stummschalten
- Lautstärke pro Tab, Verstärkung bis 300 % (Web Audio)
- Bild-im-Bild (`Ctrl+Shift+P`)
- Gaming-Modus: Hintergrund-Tabs werden schlafen gelegt
- Ressourcen-HUD mit RAM/CPU pro Tab

**Daten & Privatsphäre**
- Favoritenleiste, Lesezeichen mit Ordnern und Tags, Verlauf, Downloads
- Werbe- und Tracker-Blocker (Ghostery)
- Chrome-Erweiterungen: aus dem Chrome Web Store (URL oder ID) oder als `.crx`/`.zip`/Ordner

**Design-Studio**
- Theme-Editor mit Live-Vorschau, 12 Presets, eigenen gespeicherten Themes, Import/Export, „Zufällig“
- Hintergrund-Animationen, Glas-Effekt, Glow, Rahmenstil, Schrift, Cursor-Effekte, eigenes CSS

Frameless Glas-UI mit eigener Titlebar und Fenstersteuerung. Startseite: `jtech://newtab`.

## Starten

```powershell
npm install
npm start          # Browser starten
npm run dev        # mit DevTools für das Browser-UI
npm test           # Tests
npm run build      # Windows-Installer (NSIS, x64) nach dist/
```

## Design-Studio

Über den Regler-Button in der Toolbar öffnet sich das Design-Studio. Während es
offen ist, wird die aktive Webseite ausgeblendet. **Esc** oder ein Klick außerhalb
schließt es.

| Reiter | Inhalt |
| --- | --- |
| **Farben** | Akzentfarben, Hintergrund, Textfarben |
| **Oberfläche** | Glas-Deckkraft, Blur, Radius, Rahmen, Schatten, Sättigung, Rahmenstil |
| **Hintergrund** | Wallpaper-URL oder Animation (Orbs, Partikel, Wellen, Mesh, Rauschen, Aurora, Grid, Sterne, Matrix, Pulse, Nebel) mit Geschwindigkeit und Intensität |
| **Stil** | Browser-Stil (Standard, Aufgeräumt, Animation, Gaming, Minimal), Glow, Übergangsgeschwindigkeit, Schriftart und -größe |
| **Effekte** | Cursor-Effekte (Spur, Funken, Komet, Welle, Laser, Blasen), Farbe, Größe, Intensität, eigenes Cursor-Bild |
| **Erweitert** | Eigenes CSS für Browser-UI und Startseite |

Änderungen werden sofort angewendet und nach 250 ms automatisch gespeichert.
„Auf Standard zurücksetzen“ stellt das Obsidian-Theme wieder her.

## Standard-Hotkeys

| Aktion | Tasten |
| --- | --- |
| Neuer Tab | `Ctrl+T` |
| Tab schließen | `Ctrl+W` |
| Tab wieder öffnen | `Ctrl+Shift+T` |
| Adressleiste | `Ctrl+L`, `Alt+D` |
| Neu laden / hart neu laden | `Ctrl+R`, `F5` / `Ctrl+Shift+R`, `Ctrl+F5` |
| Zurück / Vorwärts | `Alt+←` / `Alt+→` |
| Nächster / vorheriger Tab | `Ctrl+Tab` / `Ctrl+Shift+Tab` |
| Einstellungen | `Ctrl+,` |
| Command-Palette | `Ctrl+K` |
| Tab-Suche | `Ctrl+Shift+A` |
| Auf Seite suchen | `Ctrl+F` |
| Split-View | `Ctrl+\` |
| Bild-im-Bild | `Ctrl+Shift+P` |
| Vollbild | `F11` |
| Drucken | `Ctrl+P` |
| Zoom + / − / zurücksetzen | `Ctrl+=` / `Ctrl+-` / `Ctrl+0` |
| DevTools | `F12`, `Ctrl+Shift+I` |

Hotkeys lassen sich in der `settings.json` als Arrays von Accelerators wie
`"Ctrl+Shift+T"` ändern.

## Einstellungen

Öffnen über das Zahnrad, die Seitenleiste oder `Ctrl+,`. Änderungen werden nach
250 ms automatisch gespeichert.

| Bereich | Optionen |
| --- | --- |
| Allgemein | Name für die Begrüßung, Suchmaschine (Google, DuckDuckGo, Bing, Ecosia, Startpage, Brave oder eigene Such-URL) |
| Darstellung | UI-Dichte, Favoritenleiste, Gaming-Modus, Sitzung wiederherstellen |
| Favoriten / Shortcuts | Einträge hinzufügen, öffnen, entfernen |
| JTech Bangs | Eigene Bang-Befehle anlegen |
| Lesezeichen / Verlauf / Downloads | Verwalten, durchsuchen, löschen |
| Datenschutz | Werbeblocker, Tracking-Schutz |
| Erweiterungen | Aus dem Web Store installieren, aus Datei laden, entfernen |
| Hotkeys | Übersicht der Tastenkürzel |
| Über | Version und Speicherort der Einstellungen |

Eigene Such-URLs müssen mit `http(s)://` beginnen und `%s` als Platzhalter
enthalten.

Die Einstellungen liegen in:

```
%APPDATA%\JTech Browser\settings.json
```

Dort liegen auch `session.json`, `crash.log`, der Adblock-Cache und installierte
Erweiterungen (`extensions\`). Eine alte `%APPDATA%\Pulse\settings.json` wird beim
ersten Start übernommen. Alle Werte werden im Main-Prozess validiert, bevor sie
gespeichert werden; die Datei wird atomar geschrieben, eine beschädigte Datei wird
als Backup gesichert.

## Projektstruktur

```
src/
├─ main/
│  ├─ main.js       Fenster, IPC, jtech://-Protokoll, Hotkeys, Erweiterungen, Downloads, Adblock
│  ├─ tabs.js       TabManager: eine WebContentsView pro Tab, Split-View, Medien, Injektion
│  ├─ config.js     settings.json laden/speichern und validieren
│  └─ shortcuts.js  Accelerator-Parser und Matching
├─ preload/
│  └─ preload.js    schmale contextBridge-API (window.jtech)
├─ shared/
│  └─ cursor-fx.js  Cursor-Effekte (UI, Startseite und Webseiten)
└─ renderer/
   ├─ index.html    Browser-UI + Overlays (Studio, Einstellungen, Media-Hub, HUD, Palette)
   ├─ newtab.html   Startseite (jtech://newtab)
   ├─ changelog.html Wird nach einem Update einmal angezeigt
   ├─ styles/       theme.css (Design-Tokens), app.css, obsidian.css, polish.css
   └─ js/app.js     Logik des Browser-UI
tests/              Hotkeys, Einstellungen, Theme-Validierung (node:test)
```

## Architektur-Entscheidungen

- **WebContentsView statt `<webview>`**: jeder Tab ist ein eigener Renderer-Prozess,
  das Browser-UI läuft getrennt davon.
- **Frameless Window** mit eigener Titlebar. Höhe und Seitenleistenbreite werden an
  den Main-Prozess gemeldet, damit die Webseiten pixelgenau daneben sitzen.
- **Overlays statt eigener Fenster**: Studio und Einstellungen liegen im UI-Renderer,
  die aktive Webseite wird solange ausgeblendet.
- **Sicherheit**: `contextIsolation` + `sandbox` aktiv, kein Node im Renderer, nur
  eine minimale IPC-API. In der Adressleiste sind nur `http(s)`-URLs erlaubt.
- **Theming**: alle Werte sind CSS-Variablen; die Startseite bekommt Theme, Suche und
  Shortcuts per `executeJavaScript` injiziert.

## Roadmap

1. **Hotkey-Editor**: Tasten in den Einstellungen neu belegen, mit Konflikt-Erkennung
2. **Erweiterungen**: `electron-chrome-extensions` einbinden (Popups, Toolbar-Icons, chrome.*-APIs)
3. **Verlauf** in eigene Datei auslagern und gebündelt speichern
4. **Auto-Update** (electron-updater ist eingebaut, braucht noch einen Update-Server)
5. **Sidebar** mit Schnellzugriff (Discord, Twitch, …)
6. Force-Dark-Mode, Resource-Limiter
