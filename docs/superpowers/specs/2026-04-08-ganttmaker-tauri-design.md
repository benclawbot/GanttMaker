# GanttMaker Desktop — Design Spec

**Date:** 2026-04-08
**Status:** Draft
**Author:** Claude

---

## 1. Overview

Package the existing GanttMaker React web app as a standalone Windows desktop application using **Electron + Vite**. The web app runs unchanged inside Electron; the primary changes are:
1. Replacing browser File API calls with Electron IPC calls that use native OS file dialogs
2. Adding support for `.gan` (GanttProject XML) and `.mpp` (Microsoft Project binary) read/write
3. Registering file associations so double-clicking `.gan` or `.mpp` files opens them in GanttMaker
4. Proper HiDPI / Full HD display support

The `master` branch remains the web-only version. This work happens on branch `desktop/tauri` (naming preserved despite using Electron).

---

## 2. Technology Choices

- **Electron v36** (latest stable) — desktop runtime with full Node.js main process
- **electron-builder** — NSIS installer for Windows `.exe`
- **Frontend:** existing React 19 + TypeScript + Vite + Tailwind app (minimal changes)
- **MPP support:** `node-mpp` npm package (pure Node.js, no external dependencies)
- **Build target:** Windows x64 (`.exe` NSIS installer)

---

## 3. Architecture

### 3.1 Project Structure

```
GanttMaker/
├── src/                         ← existing React app (minimal changes)
├── public/                      ← existing assets (unchanged)
├── index.html                   ← existing entry (unchanged)
├── package.json                 ← existing deps + Electron + electron-builder + node-mpp
├── vite.config.ts               ← existing + Electron plugin (vite-plugin-electron)
├── electron/
│   ├── main.ts                  ← Electron main process: window, IPC handlers, file dialogs
│   ├── preload.ts               ← contextBridge API (safe IPC exposure to renderer)
│   └── ipc/
│       ├── fileDialogs.ts       ← open/save dialogs for .gan and .mpp
│       └── mppHandler.ts        ← .mpp read/write via node-mpp
├── electron-builder.yml         ← electron-builder config (NSIS, file associations)
└── docs/superpowers/specs/      ← this file
```

### 3.2 IPC API (preload → renderer)

Exposed via `window.electronAPI`:

| Method | Signature | Description |
|---|---|---|
| `openFile` | `() => Promise<FileData \| null>` | Opens native dialog filtered to `.gan,.mpp`; returns file contents + name + detected format |
| `saveFile` | `(data: ProjectData, format: 'gan' \| 'mpp', defaultName: string) => Promise<string \| null>` | Opens native Save As dialog; writes file; returns chosen path or null |
| `onFileOpened` | `(path: string) => void` | Called by main process when a file is opened via file association |

`FileData` shape:
```ts
interface FileData {
  contents: string | ArrayBuffer; // XML string for .gan, ArrayBuffer for .mpp
  name: string;
  format: 'gan' | 'mpp';
}
```

### 3.3 File Format Support

| Format | Read | Write | Library |
|---|---|---|---|
| `.gan` | ✅ via existing `parseGanFile` (browser-side XML parse) | ✅ via existing `serializeGanFile` | built-in |
| `.mpp` | ✅ via `node-mpp` in Electron main process | ✅ via `node-mpp` in Electron main process | `node-mpp` |

**Flow for .gan:** Main process reads file → returns raw XML string → renderer parses with existing `parseGanFile`
**Flow for .mpp:** Main process reads file → `node-mpp` parses → returns normalized JSON → renderer normalizes to internal Task/Link format

### 3.4 Frontend Changes (minimal)

- **`src/App.tsx`** — replace `<input type="file">` and `downloadGanFile` Blob logic with calls to `window.electronAPI.openFile()` / `window.electronAPI.saveFile()`
- **`src/context/TaskContext.tsx`** — remove `FileSystemFileHandle` type usage (browser File System Access API not available in Electron renderer, but not critical — it was optional)
- **`vite.config.ts`** — add `vite-plugin-electron` + `vite-plugin-electron-renderer`
- No new React dependencies — Electron API is accessed through the preload bridge

### 3.5 Window Configuration

- Default size: `1200×800`, resizable, minimum `800×600`
- Title: "GanttMaker"
- Native window frame (standard OS title bar)
- HiDPI support: `webContents.setBackgroundThrottling(false)` + CSS `image-rendering` handled by Chromium
- DevTools enabled in development, disabled in production

---

## 4. Installation / Distribution

- **Development:** `npm run electron:dev` — Vite dev server + Electron window
- **Build:** `npm run electron:build` — `electron-builder` produces:
  - `dist/GanttMaker_X.X.X_x64-setup.exe` (NSIS installer)
  - `dist/GanttMaker.exe` (portable)
- **File associations** in electron-builder config:
  - `.gan` — "GanttProject Document"
  - `.mpp` — "Microsoft Project Document"
  - Both associated with the app; double-click opens GanttMaker with that file loaded
- NSIS installer registers file associations and optional context menu entries
- **No code signing** required for development/self-hosted distribution

---

## 5. File I/O Flow

```
User clicks Open
  → App calls window.electronAPI.openFile()
  → Main process: native Open dialog (.gan, .mpp filter)
  → .gan: read file → raw XML string → renderer
  → .mpp: read file → node-mpp.parse() → normalized JSON → renderer
  → App: parse normalized data → loadProject()

User clicks Save
  → App: prepare ProjectData → window.electronAPI.saveFile(data, 'gan' | 'mpp', defaultName)
  → Main process: native Save As dialog
  → .gan: renderer serializes → raw XML string → main process writes file
  → .mpp: renderer sends normalized data → main process: node-mpp.write() → writes file

File association open (double-click)
  → Windows opens GanttMaker with file path as argument
  → main.ts: process.argv detects file → openFile(path) → IPC to renderer
  → Renderer: receives file data via onFileOpened → loadProject()
```

---

## 6. Error Handling

- File read failure: show error alert in renderer via `alert()` (existing pattern)
- File write failure: show error alert in renderer
- Invalid .gan: existing parser throws, caught by existing error handling
- Invalid .mpp: `node-mpp` throws, caught by main process IPC error handler → forwarded to renderer as error response
- Unsupported format: if file extension is neither `.gan` nor `.mpp`, show "Unsupported file format" alert

---

## 7. Keyboard Shortcuts

Existing shortcuts in the app (Ctrl+Z, Ctrl+Y) are implemented in React via `document.addEventListener('keydown')` — this works identically in Electron. No changes needed.

Electron native menu bar will include:
- File → New, Open, Save, Save As...
- Edit → Undo, Redo
- All mapped to their existing handlers

---

## 8. Display / HiDPI Support

- Electron + Chromium handles DPI scaling automatically
- CSS uses relative units (rem, %) throughout — existing Tailwind setup
- No forced `zoom` levels needed; let Windows/display scaling handle it
- `webContents.setBackgroundThrottling(false)` prevents background throttling but doesn't affect display

---

## 9. Out of Scope

- macOS / Linux builds (Windows x64 only)
- Auto-update
- System tray
- Global shortcuts (beyond menu bar)
- Multi-window
