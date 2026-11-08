# JTech Browser: Electron to Tauri 2 feature-parity checklist

Source: `src/main/{main,tabs,config,resources,job-limit}.js`, `src/preload/preload.js`, `package.json`, `src/renderer/js/app.js` (uses `window.jtech` via `const api = window.jtech`).
Difficulty: **S** = under a day, **M** = a few days, **L** = research needed or partial parity only.

## Assumptions and cross-cutting constraints

- Build target is Windows x64 only (`build.win.nsis`), so WebView2 is the primary engine. `Webview::with_webview` (plus the `webview2-com` crate) gives raw `ICoreWebView2` access and closes most Wry gaps below. Linux/macOS parity would be harder.
- One window with N tab views maps to Tauri 2 multiwebview: `Window::add_child` / `WebviewBuilder`, `set_position`, `set_size`, `show`, `hide`. This sits behind the `unstable` cargo feature.
- `Webview::eval` returns no value (Electron `executeJavaScript` does). All "ask the page" features (media list, PiP, favicon, find counts) need a page-to-Rust result channel. Remote pages have no Tauri IPC by default, so use a custom URI scheme or `fetch` to a local endpoint (not a broad remote-IPC capability, which is a security risk).
- `executeJavaScript(..., userGesture=true)` has no Tauri equivalent. PiP and `play()` calls may be blocked without user activation.
- No Tauri equivalents of `did-fail-load`, `audio-state-changed`, `page-favicon-updated`, `found-in-page`, `before-input-event`, `context-menu` params, `app.getAppMetrics`. See section 2.
- UI strings are German and must be kept. `window.jtech` should stay as a thin JS shim over `invoke`/`listen` so `app.js` is untouched.

## 1. `window.jtech` API (65 methods + 20 events = 85)

(send) = `ipcRenderer.send`, fire-and-forget. (invoke) = `ipcRenderer.invoke`, returns a promise.

### Tabs and navigation

| # | Method | Electron side | IPC channel | Tauri approach | Diff |
|---|---|---|---|---|---|
| 1 | `newTab(url)` | `resolveInput`, create tab + WebContentsView, focus omnibox if no url | `tabs:new` (send) | cmd `tab_new`; `add_child(WebviewBuilder)`; port `resolveInput` (bangs, scheme allow-list) to Rust | M |
| 2 | `closeTab(id)` | Close view, push to closed-history (25), activate neighbour, recreate if last | `tabs:close` (send) | cmd `tab_close`; `Webview::close` | S |
| 3 | `activateTab(id)` | Swap child view, set `lastActiveAt`, wake if sleeping, leave split if needed | `tabs:activate` (send) | cmd; `hide`/`show` + `set_bounds`; recreate webview if sleeping | M |
| 4 | `navigate(input)` | `resolveInput`, `loadURL` on active tab, focus content | `tabs:navigate` (send) | cmd; `Webview::navigate` | S |
| 5 | `back()` | `navigationHistory.goBack` | `tabs:back` (send) | cmd; `eval("history.back()")` or WebView2 `GoBack` | S |
| 6 | `forward()` | `navigationHistory.goForward` | `tabs:forward` (send) | cmd; `eval("history.forward()")` | S |
| 7 | `reload(hard)` | `reload` / `reloadIgnoringCache`; newtab reloads `jtech://newtab` | `tabs:reload` (send) | cmd; `eval(location.reload())`; hard = WebView2 `Page.reload{ignoreCache}` via `CallDevToolsProtocolMethod` | M |
| 8 | `stop()` | `webContents.stop` | `tabs:stop` (send) | `eval("window.stop()")` or WebView2 `Stop` | S |
| 9 | `print()` | `webContents.print` | `tabs:print` (send) | `Webview::print` | S |
| 10 | `moveTab(id,index)` | Reorder map; pinned tabs stay first | `tabs:move` (send) | Pure state logic (Rust or JS) | S |
| 11 | `splitTab(id)` | Two views side by side, ratio 0.5, activate right | `tabs:split` (send) | Two child webviews with computed bounds | M |
| 12 | `unsplit()` | Remove right view, restore left active | `tabs:unsplit` (send) | Hide right webview, relayout | S |
| 13 | `splitResize(ratio)` | Clamp 0.2..0.8, relayout (min 220 px per side) | `tabs:split-ratio` (send) | `set_size`/`set_position` on both | S |
| 14 | `commandTab(id,command)` | reload / duplicate / pin / unpin / mute / unmute / close-others | `tabs:command` (send) | Dispatch cmd; mute depends on item 14a below | M |
| 15 | `setTabGroup(id,groupId)` | Set `tab.groupId` (unpins) and return settings | `tabs:group` (invoke) | Rust state + return settings | S |
| 16 | `createTabGroup(name,color)` | Add group to settings, apply update | `tabs:create-group` (invoke) | serde settings | S |
| 17 | `updateTabGroup(groupId,patch)` | Patch name/color/collapsed/order | `tabs:update-group` (invoke) | serde settings | S |
| 18 | `removeTabGroup(groupId)` | Clear group on tabs, remove from settings | `tabs:remove-group` (invoke) | serde settings + tab state | S |
| 19 | `zoom(action,value)` | Level table, per-host zoom persisted in settings | `tabs:zoom` (send) | `Webview::set_zoom`; per-host map in settings | S |
| 20 | `findInPage(query,fwd,next)` | `webContents.findInPage` | `find:start` (send) | No Wry API. Inject find script (CSS Custom Highlight API, own match counter); WebView2 find is not exposed | L |
| 21 | `stopFind()` | `stopFindInPage('clearSelection')` | `find:stop` (send) | Same injected script: clear highlights | L |

14a (not a separate API): per-tab mute. Electron `setAudioMuted`. Tauri has no API. Use WebView2 `ICoreWebView2_8::put_IsMuted` via `with_webview` (M), or JS `muted=true` on all media (fragile).

### Window and UI

| # | Method | Electron side | IPC channel | Tauri approach | Diff |
|---|---|---|---|---|---|
| 22 | `minimize()` | `window.minimize` | `window:minimize` (send) | `Window::minimize` | S |
| 23 | `toggleMaximize()` | maximize / unmaximize | `window:maximize` (send) | `Window::toggle_maximize` | S |
| 24 | `close()` | `window.close` (triggers session save) | `window:close` (send) | `Window::close` + `CloseRequested` handler | S |
| 25 | `reportChromeHeight(h)` | `tabs.setChromeHeight` then layout | `ui:chrome-height` (send) | cmd; `set_position`/`set_size` of tab views | S |
| 26 | `reportLayout(metrics)` | chromeHeight + sidebarWidth, skip while overlay open | `ui:layout` (send) | Same; also relayout on `WindowEvent::Resized` | S |
| 27 | `setDock(width)` | Reserve right-hand dock width | `ui:dock` (send) | Same layout cmd | S |
| 28 | `focusContent()` | `webContents.focus` on active tab | `ui:focus-content` (send) | `Webview::set_focus` | S |
| 29 | `toggleDevTools()` | Toggle detached DevTools on active tab | `ui:devtools` (send) | `open_devtools` / `close_devtools` / `is_devtools_open` (needs `devtools` feature in release) | S |
| 30 | `togglePictureInPicture()` | `executeJavaScript` requesting PiP on first `<video>` | `tabs:picture-in-picture` (send) | `eval` with the same snippet; may fail without user gesture | M |
| 31 | `setOverlay(open)` | Remove/add active views so HTML overlays are not covered; blocks tab hotkeys | `ui:overlay` (send) | `hide`/`show` child webviews (native webviews always sit above the main webview) | M |
| 32 | `toggleWebview(visible)` | Add/remove active view only | `ui:toggle-webview` (send) | `show`/`hide` active webview | S |

### Media

| # | Method | Electron side | IPC channel | Tauri approach | Diff |
|---|---|---|---|---|---|
| 33 | `listMedia()` | Runs `window.__jtechMedia.list()` in every tab, merges, syncs volume | `media:list` (invoke) | Init script with the existing `__jtechMedia` JS; needs result channel (eval returns nothing) | M |
| 34 | `mediaCommand(payload)` | `__jtechMedia.command(...)` in one tab | `media:command` (invoke) | Same, with result channel | M |
| 35 | `pauseAllMedia()` | `__jtechMedia.pauseAll()` in all tabs | `media:pause-all` (invoke) | Same (fire-and-forget is enough) | S |
| 36 | `setTabVolume(id,vol)` | Volume 0..3 via WebAudio gain injected in page | `media:volume` (invoke) | Reuse `buildMediaScript` as init script + `eval` | S |
| 37 | `saveTheme(theme)` | Normalize + persist, re-inject into newtab tabs, push `theme:update` | `theme:save` (invoke) | Port `normalizeTheme`; `eval` theme script into `jtech://newtab` webviews | M |

### Settings, data, downloads, extensions, updates, resources

| # | Method | Electron side | IPC channel | Tauri approach | Diff |
|---|---|---|---|---|---|
| 38 | `getSettings()` | `publicSettings()` (incl. history) | `settings:get` (invoke) | serde struct from `settings.json` | S |
| 39 | `saveSettings(patch)` | Normalize patch, then side effects: hotkeys, search, sleep, adblock, resources | `settings:save` (invoke) | Port `updateSettings` + `applySettingsUpdate` | M |
| 40 | `clearHistory()` | Empty history file, push settings | `history:clear` (invoke) | Rust fs | S |
| 41 | `openDownload(id)` | `shell.openPath` | `downloads:open` (send) | `tauri-plugin-opener` `open_path` | S |
| 42 | `showDownload(id)` | `shell.showItemInFolder` | `downloads:show` (send) | opener `reveal_item_in_dir` | S |
| 43 | `cancelDownload(id)` | `DownloadItem.cancel` | `downloads:cancel` (send) | `on_download` has no cancel handle. Use WebView2 `DownloadOperation.Cancel` via `with_webview` | L |
| 44 | `listExtensions()` | Loaded extensions with icon, badge, title | `extensions:list` (invoke) | See extensions in section 2 | L |
| 45 | `loadExtension()` | Open dialog, unpack crx/zip, load into session | `extensions:load` (invoke) | `tauri-plugin-dialog` + zip crate + WebView2 `AddBrowserExtension` (limited) | L |
| 46 | `installExtensionFromStore(input)` | Download CRX from Google update server, unpack, load | `extensions:install-from-store` (invoke) | `reqwest` + CRX3 parser in Rust + same load path | L |
| 47 | `removeExtension(id)` | Unload, drop from settings, reload tabs | `extensions:remove` (invoke) | WebView2 `Remove` on the extension | L |
| 48 | `openExtensionPopup(id,rect)` | `browserAction.activateClick` opens real popup | `extensions:open-popup` (invoke) | No equivalent: would need own popup webview at `chrome-extension://` URL with chrome.* shims | L |
| 49 | `listDownloads()` | In-memory list (max 100) with progress | `downloads:list` (invoke) | Rust list fed by `on_download`; progress via WebView2 `BytesReceivedChanged` | M |
| 50 | `getMetrics()` | Legacy per-pid cpu/memory from resource snapshot | `system:metrics` (invoke) | `sysinfo` crate | M |
| 51 | `getResources()` | Snapshot: cpu/mem history, processes mapped to tabs, events | `resources:snapshot` (invoke) | `sysinfo` + process tree under WebView2; per-tab mapping is the hard part | L |
| 52 | `getUpdateStatus()` | `updateState` + current version | `update:get` (invoke) | Rust state fed by `tauri-plugin-updater` | S |
| 53 | `checkForUpdates()` | `autoUpdater.checkForUpdates` | `update:check` (invoke) | `updater.check()` | M |
| 54 | `installUpdate()` | `quitAndInstall(false, true)` when ready | `update:install` (invoke) | `download_and_install` then `restart`; needs signed artifacts | M |
| 55 | `resourceAction(payload)` | close / sleep / wake tab, kill helper pid | `resources:action` (invoke) | Tab actions: Rust state. Kill: only pids we can prove are WebView2 helpers | L |

### Favorites, saved, shortcuts, bookmarks

| # | Method | Electron side | IPC channel | Tauri approach | Diff |
|---|---|---|---|---|---|
| 56 | `addFavorite(entry)` | Validate URL, dedupe, persist | `favorites:add` (invoke) | serde settings | S |
| 57 | `removeFavorite(id)` | Remove, persist | `favorites:remove` (invoke) | serde settings | S |
| 58 | `addSaved(entry)` | Add to saved list (max 200) | `saved:add` (invoke) | serde settings | S |
| 59 | `removeSaved(id)` | Remove | `saved:remove` (invoke) | serde settings | S |
| 60 | `addShortcut(entry)` | Add newtab shortcut (max 30) | `shortcuts:add` (invoke) | serde settings | S |
| 61 | `removeShortcut(id)` | Remove | `shortcuts:remove` (invoke) | serde settings | S |
| 62 | `addBookmark(entry)` | Add/update bookmark with folder and tags (max 500) | `bookmarks:add` (invoke) | serde settings | S |
| 63 | `removeBookmark(id)` | Remove | `bookmarks:remove` (invoke) | serde settings | S |
| 64 | `addBookmarkFolder(name,parentId)` | Add folder | `bookmarks:addFolder` (invoke) | serde settings | S |
| 65 | `removeBookmarkFolder(id)` | Remove folder + subfolders, move bookmarks to root | `bookmarks:removeFolder` (invoke) | serde settings | S |

### Events (main to renderer)

Tauri approach for all: `app.emit_to("main", name, payload)` and `listen` in the shim, which returns the unlisten function like the Electron versions.

| # | Event method | Electron side (when it fires) | IPC channel | Tauri approach | Diff |
|---|---|---|---|---|---|
| 66 | `onState(cb)` | Whole tab/split state on every tab change | `tabs:state` | Emit from Rust `TabManager`. Needs title, loading, canGoBack/Forward, audible, favicon from the sources in section 2 | M |
| 67 | `onWindowState(cb)` | `{maximized}` on maximize/unmaximize and load | `window:state` | `WindowEvent::Resized` + `is_maximized` | S |
| 68 | `onFullscreen(cb)` | `{fullscreen}` on enter/leave | `window:fullscreen` | No dedicated event: check `is_fullscreen` on `Resized` | S |
| 69 | `onFocusOmnibox(cb)` | Ctrl+L, new tab | `ui:focus-omnibox` | Emit; depends on hotkeys | S |
| 70 | `onOpenSettings(cb)` | Ctrl+, | `ui:open-settings` | Emit; depends on hotkeys | S |
| 71 | `onOpenTabSearch(cb)` | Ctrl+Shift+A | `ui:tab-search` | Emit; depends on hotkeys | S |
| 72 | `onOpenCommandPalette(cb)` | Ctrl+K | `ui:command-palette` | Emit; depends on hotkeys | S |
| 73 | `onOpenTaskManager(cb)` | Shift+Esc | `ui:task-manager` | Emit; depends on hotkeys | S |
| 74 | `onHistoryEntry(cb)` | New/updated history entry after navigation | `history:entry` | Emit from navigation handler | S |
| 75 | `onWindowFocus(cb)` | Window focus/blur | `window:focus` | `WindowEvent::Focused` | S |
| 76 | `onToast(cb)` | Text toast (e.g. link copied) | `ui:toast` | Emit | S |
| 77 | `onUpdateStatus(cb)` | Updater state changes | `update:status` | Emit from updater callbacks | S |
| 78 | `onResourceEvent(cb)` | Resource manager log line | `resources:event` | Emit | S |
| 79 | `onOpenFind(cb)` | Ctrl+F | `ui:find-open` | Emit; depends on hotkeys | S |
| 80 | `onFindResult(cb)` | `found-in-page` result for active tab | `find:result` | Emit from injected find script via result channel | L |
| 81 | `onTheme(cb)` | Theme changed | `theme:update` | Emit | S |
| 82 | `onSettings(cb)` | Settings changed | `settings:update` | Emit | S |
| 83 | `onHistory(cb)` | Full history replaced (declared; no sender found in main.js) | `history:update` | Emit if still needed; check for dead code first | S |
| 84 | `onDownloads(cb)` | Download list/progress changed | `downloads:update` | Emit from `on_download` | S |
| 85 | `onExtensions(cb)` | Extension list changed | `extensions:update` | Emit | S |

## 2. Main-process features not exposed as API

| Feature | Electron implementation | Tauri equivalent | Diff |
|---|---|---|---|
| Session restore | `session.json` on window close; on start only the active tab loads, others via `createLazy` (title/favicon shown, sleeping); restores pinned, group, muted, zoom, boost volume | serde to `session.json` on `CloseRequested`; lazy tabs = tab records without a webview, created on activate | M |
| Auto-sleep | Every 60 s `sleepIdleTabs` (`autoSleepMinutes`: 0/15/30/60/120); skips active, split, pinned, audible. Sleep = destroy view, keep record. Also gaming mode sleeps all background tabs | Same logic in Rust; sleep = `Webview::close`, wake = rebuild with stored URL. Audible check needs WebView2 `IsDocumentPlayingAudio` | M |
| Resource manager | `app.getAppMetrics()` every 2 s, maps pid to tab/ui/extension via `getOSProcessId`, 90-sample history, RAM limit (sleep biggest background tab), CPU limit (3 samples over, sleep top CPU tab), kill helper pids, low priority via `os.setPriority` | `sysinfo` for the process tree rooted at our pid (WebView2 children included). Per-tab pid mapping: no `getOSProcessId`; try WebView2 `BrowserProcessId` and `ProcessInfos`/`GetProcessExtendedInfos` (newer SDK), else show "browser + webview total" only. Priority via `windows` crate `SetPriorityClass` | L |
| CPU job limit | `job-limit.js`: Windows Job Object hard cap via `koffi` FFI (`CreateJobObjectW`, `SetInformationJobObject` class 15, `AssignProcessToJobObject`) | Native Rust with `windows` crate. Easier than FFI: put our own process in the job at startup so WebView2 children inherit it. No koffi, no polling | S |
| Ad blocker | `@ghostery/adblocker-electron` on `session.defaultSession`; engine cached in `adblocker-engine.bin`, refreshed after 24 h, timer every 6 h | No request interception in Wry. Options: (a) WebView2 `WebResourceRequested` via `with_webview` + `adblock-rust` crate (Brave engine, same lists), (b) local filtering proxy, (c) cosmetic filters via init script only. (a) preferred | L |
| Chrome extensions | `electron-chrome-extensions` (chrome.tabs/action/contextMenus, popups, badge), crx/zip unpack, store install, warns on unsupported MV3 permissions | No equivalent. WebView2 has `AddBrowserExtension` (preview, limited chrome.* APIs, no popup UI control). Recommend descoping or a later "bring your own extension" experiment | L |
| Downloads | `will-download` on session; list max 100, progress events, open/show/cancel | `WebviewBuilder::on_download` (Started/Finished, choose destination); progress and cancel via WebView2 `DownloadStarting`/`DownloadOperation` | M |
| Context menu | Per-tab `context-menu` with link/image/selection/editable params, extension items, German labels (new tab, copy, save page, print, devtools) | Params not available. Inject `contextmenu` listener (collect link, src, selection, editable) and send through result channel, then show native `tauri::menu::Menu::popup`. Or WebView2 `ContextMenuRequested` (full params) | M |
| Hotkeys inside pages | `before-input-event` on chrome UI and each tab view; `shortcuts.js` compiles accelerators from settings; 24 actions; blocked while overlay is open | No equivalent. Init script with capture-phase `keydown` listener matching the compiled accelerator table, `preventDefault`, then post to Rust (result channel). Fallback: WebView2 `AcceleratorKeyPressed` via `with_webview` (sees keys before the page). `global-shortcut` plugin is not suitable (system-wide) | L |
| User agent | `app.userAgentFallback` strips `Electron/x` and app token to look like Chrome | `WebviewBuilder::user_agent(...)`. WebView2 already reports Edge/Chrome, so just keep a clean string | S |
| Changelog window | After version change (`last-version.txt`), opens second `BrowserWindow` with `changelog.html`; also served at `jtech://changelog` | `WebviewWindowBuilder` + same version file | S |
| Auto-update | `electron-updater`, GitHub Releases (`bartels-de/jtech-browser`), check 15 s after start then every 4 h, background download, install on quit or on demand | `tauri-plugin-updater` with signed bundles and `latest.json` (can be hosted as a GitHub release asset). Migration of installed Electron users needs a final Electron release that installs the Tauri build | M |
| `jtech://` protocol | `protocol.handle('jtech')`: `jtech://newtab` (html + `assets/*` with path-traversal guard) and `jtech://changelog`; registered privileged (standard, secure, fetch) | `register_uri_scheme_protocol("jtech", ...)`. On Windows the page URL becomes `http://jtech.localhost/...`, so URL checks (`startsWith('jtech://newtab')`, `displayUrl`) need a mapping layer | M |
| History file | `history.json`: max 2000, 30 s same-URL merge, debounced write 3 s, atomic `.tmp` rename, corrupt backup, migration from `settings.json` | Port to Rust with `serde_json`, same file name so existing data carries over | S |
| Settings file | `settings.json` deep-merge defaults, normalizers, theme version reset, atomic write, legacy `Pulse` path | Port normalizers to Rust (or keep in the JS bridge). Keep file format identical | M |
| Window shell | Frameless, hidden title bar, min 900x600, single-instance lock, menu removed, quit on all windows closed, crash log in `crash.log` | `decorations(false)`, drag region, `tauri-plugin-single-instance`, panic hook to `crash.log` | S |
| Navigation guards | `will-navigate` allows only http(s)/jtech/chrome-extension; `setWindowOpenHandler` opens http(s) in new tab; PiP, error page on `did-fail-load` (code -3 ignored) | `on_navigation` (allow-list), `on_new_window` (open as tab). Load errors: no event in Wry, use WebView2 `NavigationCompleted` (`IsSuccess`, `WebErrorStatus`) via `with_webview`, then load the data: error page | M |
| Newtab injection | On `dom-ready` of `jtech://newtab`: theme, search/bangs, user name, shortcuts, custom CSS, cursor FX, backgrounds, background pause when blurred | Init scripts / `eval` on webviews whose URL is newtab; reuse `buildThemeScript` etc. unchanged | M |
| Cursor FX | Injects `src/shared/cursor-fx.js` into every page when effect is not `none` | Init script (conditional on settings) | S |
| Per-tab state sync | `page-title-updated`, `page-favicon-updated`, `audio-state-changed`, loading, `did-navigate(-in-page)`, history | Title: `on_document_title_changed`. Loading: `on_page_load`. URL: `on_navigation` + `popstate`/`pushState` hook. Favicon: injected `<link rel=icon>` observer. canGoBack/Forward + audible: WebView2 via `with_webview` | M |
| Background throttling | `backgroundThrottling` on, disabled for audible tabs; pause newtab animation when blurred | WebView2 hidden webviews are throttled by the engine. Audible exemption not controllable; test | M |
| Bang/search resolution | `resolveInput` in main.js | Port to Rust (pure function, unit-testable) | S |

## 3. Proposed phases

| Phase | Goal | Contents | Exit criteria |
|---|---|---|---|
| 0. Spikes (1 wk) | De-risk | (a) multiwebview with 3 tab webviews + chrome webview, resize and z-order; (b) page-to-Rust result channel from remote https pages; (c) `with_webview` + `webview2-com` call for mute, `IsDocumentPlayingAudio`, `WebResourceRequested`; (d) `jtech.localhost` newtab load | Decision on items marked L; confirm `unstable` feature is acceptable |
| 1. MVP shell | Usable single-window browser | Frameless window + controls (22-24, 67, 68, 75), settings/history persistence (38-40, 56-65), `jtech://` protocol + newtab, tabs 1-6, 8, 10, 25-28, 32, `onState` (66) with title/loading/URL, user agent, single instance, `resolveInput` + bangs | Open, navigate, switch, close tabs; settings and bookmarks survive restart |
| 2. Browsing core | Daily-driver basics | Reload hard (7), zoom (19), print (9), devtools (29), overlay (31), context menu, in-page hotkeys + hotkey events (69-73, 79), downloads (41-43, 49, 84), history events (74), navigation guards + error page, pin/duplicate/close-others (14), groups (15-18), session restore, closed-tab history | Hotkey table works in chrome and in pages; downloads panel works |
| 3. Power features | Gaming/media differentiators | Split view (11-13), find in page (20, 21, 80), PiP (30), media hub + volume + mute (33-36, 14a), theme/cursor FX/newtab injection (37, 81, 82), auto-sleep, gaming mode, background pause | Media hub and Design Studio match Electron behaviour |
| 4. Performance | Resource panel and limits | Resource snapshot (50, 51, 55, 78), RAM/CPU governor, Windows job-object hard cap, low priority | Task manager lists tabs with plausible cpu/mem; CPU cap holds under load |
| 5. Privacy and delivery | Ship it | Ad blocker (WebView2 + adblock-rust), updater + signing (52-54, 77), changelog window, NSIS installer, GitHub release pipeline, migration path for existing Electron installs and data in `userData` | Signed installer auto-updates from a test release |
| 6. Extensions (optional) | Decide scope | Items 44-48, 85 via WebView2 extension support, or formally drop | Explicit go/no-go decision recorded |

## 4. Hardest items

1. Chrome extensions (44-48): no Wry/Tauri API, WebView2 support is partial and has no popup/action UI.
2. Ad blocker: needs request interception from WebView2 (`with_webview`) plus a Rust filter engine.
3. Hotkeys inside pages: no `before-input-event`; needs injected key capture or WebView2 accelerator hook.
4. Resource manager per-tab attribution: no `getAppMetrics` or `getOSProcessId`.
5. Find in page with match counts, and audible-state detection: neither is exposed by Tauri.

## 5. Open questions

- Is Windows the only target? Everything marked "via `with_webview`" is WebView2-specific.
- Is the `unstable` multiwebview feature acceptable for production?
- Should tab state live in Rust (port of `TabManager`) or in the JS bridge? Agree with `tauri-core` before Phase 1.
- Are extensions required for parity, or can they be dropped (uBlock Origin Lite already fails on Electron because of unsupported `declarativeNetRequest`)?
- How are existing Electron users migrated (data folder location, installer replacement, update channel)?
- Is `onHistory` (`history:update`) used? No sender exists in `main.js`.
