# JTech Browser

A gaming-oriented desktop browser built on **Electron 45** (Chromium), focused on
a fully customizable interface. The browser UI is in German.

## Features (v0.8.1)

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
- Resources panel (`Shift+Esc`): live CPU/RAM charts, process manager (close, sleep or end individual processes), CPU and RAM limits, low priority mode

**Data & privacy**
- Favorites bar, bookmarks with folders and tags, history, downloads
- Ad and tracker blocker (Ghostery)
- Chrome extensions: from the Chrome Web Store (URL or ID) or as `.crx`/`.zip`/folder

**Design Studio**
- Theme editor with live preview, 11 presets (dark, calm and light), saved custom themes, import/export, randomize
- 8 animated canvas backgrounds with live preview tiles, glass effect, glow, fonts, cursor effects, custom CSS

Frameless glass UI with a custom title bar and window controls. New tab page: `jtech://newtab`.

## Getting started

```powershell
npm install
npm start          # start the browser
npm run dev        # with DevTools for the browser UI
npm test           # run tests
npm run build      # Windows installer (NSIS, x64) into dist/
```

## Releases & automatic updates

Installed browsers update themselves from the
[GitHub releases](https://github.com/bartels-de/jtech-browser/releases): new
versions are downloaded in the background and installed on the next restart.
"Update ready" in the toolbar (or Settings → About) restarts immediately.

To publish a release:

1. Bump `version` in `package.json` and add the changes to `src/renderer/changelog.html`.
2. Merge into `main`.
3. Push a matching tag:

   ```powershell
   git tag v0.8.1
   git push origin v0.8.1
   ```

The **Release** workflow (`.github/workflows/release.yml`) then runs the tests,
builds the Windows installer and publishes it together with `latest.yml`, which
installed browsers check every four hours. The tag must match the version in
`package.json`, otherwise the workflow stops.

The installer is not code-signed, so Windows SmartScreen may show a warning on
the first install.

## Design Studio

The slider button in the toolbar opens the Design Studio. While it is open, the
active web page is hidden. **Esc** or a click outside closes it.

The left column shows a live preview, the presets and your saved themes. The
right side has five tabs:

| Tab | Contents |
| --- | --- |
| **Background** | Gallery of animated backgrounds with live previews, or a custom image URL; speed and intensity |
| **Colors** | Accent, second accent, background and text (the dimmed text color is derived automatically) |
| **Surface** | Style (default, clean, lively, gaming, minimal), glass opacity, blur, radius, glow, font and size |
| **Cursor** | Cursor effect, pointer style, effect color, strength and size |
| **Advanced** | Fine-tuning (stroke, shadow, glass saturation, transitions, border style) and custom CSS |

**Presets:** Nova (default), Synthwave, Toxic, Inferno, Hyperdrive, Abyss,
Sakura, Forest, Graphite, Paper (light) and Daylight (light). Switching presets
keeps your custom CSS.

**Backgrounds:** Calm (no motion), Network, Synthwave, Flow, Hyperdrive,
Hex grid, Nebula, Ribbons and Embers. They are drawn on a canvas by
`src/shared/backgrounds.js`, which is shared by the browser UI, the new tab page
and the studio previews. Animations pause in gaming mode, in hidden tabs and
when the system asks for reduced motion.

Changes apply immediately and are saved automatically after 250 ms. "Reset"
restores the Nova theme.

## Resources panel

The bar-chart button in the toolbar (or `Shift+Esc`) opens the resources panel
on the right. It shows the browser's total CPU (as a share of all cores) and RAM
over the last three minutes, the latest automatic actions and a process list
sorted by CPU or RAM.

| Setting | Effect |
| --- | --- |
| **Max. CPU** | Hard cap on Windows: all browser processes run in a job object whose CPU time Windows limits. Without `koffi` (or on other systems) the limit is soft: background tabs are throttled and the busiest background tab is put to sleep. |
| **Max. RAM** | Soft limit: above it, the background tab using the most memory is put to sleep. Active, pinned and audible tabs stay awake. A hard RAM cap is not used because it would crash processes. |
| **Low priority** | Lowers the priority of all browser processes so games get the CPU first. |

In the process list, tabs can be put to sleep, woken up or closed. Helper
processes (GPU, services, extensions) can be ended after a confirmation;
Chromium restarts them when needed.

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
| Resources & processes | `Shift+Esc` |
| Copy page link | `Ctrl+Shift+C` |
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
│  ├─ resources.js  Resource manager: metrics, process list, limits
│  ├─ job-limit.js  Hard CPU cap via a Windows job object (koffi)
│  ├─ config.js     Load, save and validate settings.json
│  └─ shortcuts.js  Accelerator parser and matching
├─ preload/
│  └─ preload.js    Minimal contextBridge API (window.jtech)
├─ shared/
│  ├─ cursor-fx.js    Cursor effects (UI, new tab page and web pages)
│  └─ backgrounds.js  Animated canvas backgrounds (UI, new tab page, studio previews)
└─ renderer/
   ├─ index.html    Browser UI + overlays (studio, settings, media hub, HUD, palette)
   ├─ newtab.html   New tab page (jtech://newtab)
   ├─ changelog.html Shown once after an update
   ├─ styles/       theme.css (design tokens), app.css, obsidian.css, studio.css (Design Studio)
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
2. **Sidebar** with quick access (Discord, Twitch, …)
3. Force dark mode

## License

MIT
