# JTech Browser

A gaming-oriented desktop browser built on **Electron 45** (Chromium), focused on
a fully customizable interface. The browser UI is in German.

## Features (v0.7.0)

**Tabs & navigation**
- Vertical tabs in the sidebar (resizable by dragging)
- Tab groups with colors, pinning, muting, duplicating, tab context menu
- Split view (two tabs side by side, adjustable ratio)
- Tab search (`Ctrl+Shift+A`) and command palette (`Ctrl+K`)
- Session restore on startup, reopen recently closed tabs
- Address and search bar with suggestions from open tabs, bookmarks and history
- **JTech Bangs**: `!yt`, `!yt-d`, `!g`, `!ddg`, `!gh` plus custom bangs – in the address bar and on the new tab page
- Per-site zoom (persisted), find in page, print, fullscreen
- Branded error page instead of Chromium error codes

**Media & gaming**
- Media hub: all playing video/audio with play/pause, seeking and muting
- Per-tab volume, boost up to 300 % (Web Audio)
- Picture-in-picture (`Ctrl+Shift+P`)
- Gaming mode: background tabs are put to sleep
- Resource HUD with RAM/CPU per tab

**Data & privacy**
- Favorites bar, bookmarks with folders and tags, history, downloads
- Ad and tracker blocker (Ghostery)
- Chrome extensions: from the Chrome Web Store (URL or ID) or as `.crx`/`.zip`/folder

**Design Studio**
- Theme editor with live preview, 12 presets, saved custom themes, import/export, randomize
- Background animations, glass effect, glow, border style, fonts, cursor effects, custom CSS

Frameless glass UI with a custom title bar and window controls. New tab page: `jtech://newtab`.

## Getting started

```powershell
npm install
npm start          # start the browser
npm run dev        # with DevTools for the browser UI
npm test           # run tests
npm run build      # Windows installer (NSIS, x64) into dist/
```

## Design Studio

The slider button in the toolbar opens the Design Studio. While it is open, the
active web page is hidden. **Esc** or a click outside closes it.

| Tab | Contents |
| --- | --- |
| **Colors** | Accent colors, background, text colors |
| **Surface** | Glass opacity, blur, radius, stroke, shadow, saturation, border style |
| **Background** | Wallpaper URL or animation (orbs, particles, waves, mesh, noise, aurora, grid, stars, matrix, pulse, fog) with speed and intensity |
| **Style** | Browser style (default, clean, animated, gaming, minimal), glow, transition speed, font family and size |
| **Effects** | Cursor effects (trail, sparks, comet, ripple, laser, bubbles), color, size, intensity, custom cursor image |
| **Advanced** | Custom CSS for the browser UI and the new tab page |

Changes apply immediately and are saved automatically after 250 ms. "Reset to
default" restores the Obsidian theme.

## Default hotkeys

| Action | Keys |
| --- | --- |
| New tab | `Ctrl+T` |
| Close tab | `Ctrl+W` |
| Reopen closed tab | `Ctrl+Shift+T` |
| Focus address bar | `Ctrl+L`, `Alt+D` |
| Reload / hard reload | `Ctrl+R`, `F5` / `Ctrl+Shift+R`, `Ctrl+F5` |
| Back / forward | `Alt+←` / `Alt+→` |
| Next / previous tab | `Ctrl+Tab` / `Ctrl+Shift+Tab` |
| Settings | `Ctrl+,` |
| Command palette | `Ctrl+K` |
| Tab search | `Ctrl+Shift+A` |
| Find in page | `Ctrl+F` |
| Split view | `Ctrl+\` |
| Picture-in-picture | `Ctrl+Shift+P` |
| Fullscreen | `F11` |
| Print | `Ctrl+P` |
| Zoom in / out / reset | `Ctrl+=` / `Ctrl+-` / `Ctrl+0` |
| DevTools | `F12`, `Ctrl+Shift+I` |

Hotkeys can be changed in `settings.json` as arrays of accelerators such as
`"Ctrl+Shift+T"`.

## Settings

Open via the gear icon, the sidebar or `Ctrl+,`. Changes are saved automatically
after 250 ms.

| Section | Options |
| --- | --- |
| General | Name for the greeting, search engine (Google, DuckDuckGo, Bing, Ecosia, Startpage, Brave or a custom search URL) |
| Appearance | UI density, favorites bar, gaming mode, restore session |
| Favorites / Shortcuts | Add, open and remove entries |
| JTech Bangs | Create custom bang commands |
| Bookmarks / History / Downloads | Manage, search, delete |
| Privacy | Ad blocker, tracking protection |
| Extensions | Install from the Web Store, load from file, remove |
| Hotkeys | Overview of keyboard shortcuts |
| About | Version and settings location |

Custom search URLs must start with `http(s)://` and contain `%s` as the query
placeholder.

Settings are stored in:

```
%APPDATA%\JTech Browser\settings.json
```

The same folder also holds `history.json` (browsing history, saved in batches),
`session.json`, `crash.log`, the ad blocker cache and installed extensions
(`extensions\`). An old `%APPDATA%\Pulse\settings.json` is
migrated on first start. All values are validated in the main process before
they are saved; the file is written atomically, and a corrupt file is backed up.

## Project structure

```
src/
├─ main/
│  ├─ main.js       Window, IPC, jtech:// protocol, hotkeys, extensions, downloads, ad blocker
│  ├─ tabs.js       TabManager: one WebContentsView per tab, split view, media, script injection
│  ├─ config.js     Load, save and validate settings.json
│  └─ shortcuts.js  Accelerator parser and matching
├─ preload/
│  └─ preload.js    Minimal contextBridge API (window.jtech)
├─ shared/
│  └─ cursor-fx.js  Cursor effects (UI, new tab page and web pages)
└─ renderer/
   ├─ index.html    Browser UI + overlays (studio, settings, media hub, HUD, palette)
   ├─ newtab.html   New tab page (jtech://newtab)
   ├─ changelog.html Shown once after an update
   ├─ styles/       theme.css (design tokens), app.css, obsidian.css, polish.css
   └─ js/app.js     Browser UI logic
tests/              Hotkeys, settings, theme validation (node:test)
```

## Architecture decisions

- **WebContentsView instead of `<webview>`**: every tab runs in its own renderer
  process, separate from the browser UI.
- **Frameless window** with a custom title bar. The UI height and sidebar width
  are reported to the main process so web pages are positioned pixel-perfectly.
- **Overlays instead of separate windows**: the studio and settings live in the UI
  renderer; the active web page is hidden while they are open.
- **Security**: `contextIsolation` + `sandbox` enabled, no Node in the renderer,
  only a minimal IPC API. The address bar only allows `http(s)` URLs.
- **Theming**: all values are CSS variables; the new tab page receives theme,
  search and shortcuts via `executeJavaScript`.

## Roadmap

1. **Hotkey editor**: rebind keys in settings, with conflict detection
2. **Extensions**: integrate `electron-chrome-extensions` (popups, toolbar icons, chrome.* APIs)
3. **Auto-update** (electron-updater is built in but still needs an update server)
4. **Sidebar** with quick access (Discord, Twitch, …)
5. Force dark mode, resource limiter

## License

MIT
