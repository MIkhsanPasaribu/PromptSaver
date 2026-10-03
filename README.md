# PromptSaver

An offline prompt manager for desktop and mobile. Store, organise, and reuse your AI prompts
without an account, without a server, and without a network connection.

PromptSaver keeps every prompt in a local SQLite database on your own device. Moving a collection
between devices means moving one file. On Windows, the app can also collapse into a small always-on
desktop widget so a prompt is one keystroke away while you work elsewhere.

The interface is neo-brutalist: thick borders, hard offset shadows, flat high-contrast colour, and
motion that stays out of the way.

---

## Contents

- [Highlights](#highlights)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Commands](#commands)
- [Project layout](#project-layout)
- [Architecture rules](#architecture-rules)
- [Language](#language)
- [Testing](#testing)
- [Measured weight](#measured-weight)
- [Platform status](#platform-status)
- [Widget mode](#widget-mode)
- [Automatic backups](#automatic-backups)
- [App lock](#app-lock)
- [Privacy](#privacy)
- [Known gaps](#known-gaps)

---

## Highlights

| Area       | What is in the build                                                                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prompts    | Create, view, edit, duplicate, soft delete, restore, permanent delete, empty trash, automatic draft recovery                                                                     |
| Organising | Folders with case-insensitive unique names, many tags per prompt with suggestions, FTS5 search across title, body, and tags with term highlighting, favourites, pinning          |
| Reuse      | One-tap copy from a card or the detail screen, keyboard shortcuts, `{{variable}}` templates filled at copy time, ten most recent versions per prompt with restore                |
| Transfer   | Export all or a selection to a `.promptsaver` file with a sha256 checksum, import preview, conflict strategy, atomic import in a single transaction                              |
| Interface  | Neo-brutalist tokens from `DESIGN.md`, timed motion with reduce-motion support, light and dark themes, three-screen onboarding                                                   |
| Settings   | Theme, animation, list order, local collection statistics, reset to defaults, erase everything with two confirmations, automatic weekly backups                                  |
| Lock       | Optional 4-12 digit PIN enforced in Rust: asked on every start and after an idle delay, five wrong tries then a 60-second wait, protected window content, fingerprint on Android |
| Widget     | The same window in a compact mode: separate geometry, draggable bar, always on top, OS acrylic transparency, global shortcut, tray, and a quick-add form                         |
| Everywhere | One codebase for Windows, macOS, Linux, and Android; mobile layout with safe-area handling and a back button driven by the screen stack                                          |

---

## Tech stack

| Layer    | Choice                                                   | Why                                                                                                      |
| -------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Shell    | Tauri 2 with the OS webview                              | Installers far smaller than Electron; first-party APIs for frameless windows, tray, and global shortcuts |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4              | Component model with a token-driven stylesheet; no runtime CSS-in-JS cost                                |
| UI kit   | shadcn/ui (Radix) restyled, Motion, lucide-react, sonner | Project-owned component source, transform/opacity animation, accessible primitives                       |
| State    | Zustand                                                  | Small stores; navigation is a screen stack rather than a router                                          |
| Forms    | React Hook Form + Zod                                    | One schema per form, inline Indonesian or English messages, revalidated in Rust                          |
| Language | i18next + react-i18next                                  | English by default, Indonesian selectable, every string in a paired dictionary with a parity guard test  |
| Backend  | Rust                                                     | Single process, no async server, no network code at all                                                  |
| Database | SQLite (`rusqlite`, bundled, FTS5)                       | WAL mode, foreign keys on, versioned migrations through `PRAGMA user_version`                            |
| Identity | UUID v7, timestamps as epoch milliseconds                | Sortable ids, no timezone ambiguity on disk                                                              |

---

## Prerequisites

- Node.js 22.12 or newer and pnpm 10.x (this repository was built with Node 26 and pnpm 11).
- Rust stable through `rustup`, plus the [Tauri OS prerequisites](https://v2.tauri.app/start/prerequisites/).
- Windows only: WebView2 runtime (the installer embeds the bootstrapper, not the offline bundle).
- Android only: Android Studio, Android SDK, NDK, and `JAVA_HOME`, `ANDROID_HOME`, `NDK_HOME` set.
- Set `CARGO_TARGET_DIR` once per machine to a folder **outside** the workspace. The repository lives
  in OneDrive, and file locks during sync make Rust compilation fail or crawl. `.cargo/config.toml`
  deliberately does not hardcode a path so it survives a move to another machine:

  ```powershell
  setx CARGO_TARGET_DIR "$env:USERPROFILE\.cache\promptsaver-cargo-target"
  ```

  Open a new terminal afterwards. Without it, cargo writes to `src-tauri/target` and every build
  artifact gets synced.

Package manager is `pnpm` everywhere; the lockfile is committed and CI installs with `--frozen-lockfile`.

---

## Commands

Run everything from the repository root.

```bash
pnpm install --frozen-lockfile        # install frontend dependencies
pnpm tauri dev                        # desktop app with hot reload
pnpm tauri build                      # desktop release bundle and installer
pnpm tauri android dev                # Android on an emulator or device
pnpm tauri android build --apk        # Android release APKs
pnpm typecheck                        # tsc --noEmit, both the app and the Vite config project
pnpm lint                             # eslint . --max-warnings 0
pnpm test                             # vitest run
pnpm format                           # prettier --write .
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo fmt --manifest-path src-tauri/Cargo.toml --check
```

Database migrations run automatically at startup. To add one, create
`src-tauri/database/migrations/NNNN_description.sql` with the next sequence number; never insert a
number between existing files.

A change is finished when `pnpm typecheck`, `pnpm lint`, `pnpm test`, `cargo clippy`, and
`cargo test` are all green.

---

## Project layout

Feature-based, not file-type based. Tauri requires `src-tauri/` at the root, so the mapping is:
frontend is `src/`, backend is `src-tauri/src/`.

```text
promptsaver/
  AGENTS.md  PRD.md  DESIGN.md  README.md
  src/                                  FRONTEND (React + TypeScript)
    app/                                shell: desktop, mobile, and widget layouts, providers, navigation
    components/ui/                      shadcn/ui components, owned by this project
    features/
      prompts/ folders/ tags/ search/ trash/
      transfer/ cadangan/ widget/ settings/ onboarding/
        components/  hooks/  services/  types/
    lib/                                cross-feature helpers: IPC wrapper, formatting, cn()
    styles/index.css                    design tokens as Tailwind v4 @theme
  src-tauri/                            BACKEND (Rust)
    database/migrations/                NNNN_description.sql
    src/
      core/                             connection, errors, shared state, paths, background work
      features/<fitur>/                 command.rs  service.rs  repository.rs  model.rs
```

Rust tests live next to the code (`#[cfg(test)] mod tests`); frontend tests sit beside their
feature as `[fitur].test.tsx`.

---

## Architecture rules

These are load-bearing. The full list lives in `AGENTS.md`.

- `command.rs` stays thin (routing and input validation), `service.rs` holds business logic, and
  `repository.rs` is the only layer that executes SQL.
- The frontend never touches the database. It calls commands through `src/lib/` and
  `features/*/services/`.
- Every command returns `Result<T, GalatAplikasi>`; a signature change must update the matching
  TypeScript types in the same commit.
- All SQL is parameterised. No `unwrap()` or `expect()` on production paths.
- Import is atomic: one SQLite transaction, full rollback on failure.
- User-visible strings, variable names, and comments are Indonesian; file names follow framework
  conventions.
- Heavy database work runs off the UI thread (`core::task`), so a large import cannot freeze the
  window or the widget.

---

## Language

The interface ships in two languages: English by default and Indonesian as a choice, switchable in
Settings without restarting. No user-visible string lives in a component. Each screen owns a
dictionary group in `src/lib/i18n/sumber/`, as a pair of files (`<group>-id.ts` and
`<group>-en.ts`) whose file name is also the key prefix, so adding a screen means adding two files
and touching nothing else.

Components read text through `const { t } = useTerjemah()`; code outside React (stores, toasts)
uses `terjemah("group.key")`. `src/lib/i18n/kamus.test.ts` is the guard: it fails when a group is
missing its counterpart, when the key sets differ, when a value is empty, when `{{placeholder}}`
names drift between languages, or when an English value is still the Indonesian text.

Validation messages stay Indonesian in Rust, because the backend is the source of truth.
`src/lib/galat.ts` maps a returned message to the active language using the dictionary, matching
exact strings first and parameterised templates second. Anything unmapped is shown as the backend
wrote it, so a new server-side message degrades to Indonesian rather than disappearing.

Date and number formatting follows the interface language, not only the device locale.

---

## Testing

- Frontend: Vitest and React Testing Library on jsdom.
- Backend: `cargo test` against an in-memory SQLite connection.
- Coverage targets: Rust services and repositories 80%, frontend hooks and services 70%.
- Required before merge for: business logic, validation on both sides, FTS search, export and import
  (including a corrupt file, a bad checksum, an unknown schema version, and rollback), soft delete
  and restore, and template variable filling.
- Export regression: a fixture per `schemaVersion` in `src-tauri/database/fixtures/` must always
  import.
- Manual per release: widget mode on Windows, export on desktop then import on Android, animations
  with reduce motion on, low-spec hardware.

Current state: 79 Rust tests and 110 frontend tests pass; clippy, rustfmt, ESLint, and Prettier are
clean.

---

## Measured weight

Windows 11 release build, measured with PowerShell and Chrome DevTools Protocol against the same
binary the installer ships. RAM is the sum of private working sets across the whole process tree;
`WorkingSet64` is not used because WebView2 shares pages between its processes. Cold start is
recorded at two points in the same launch: first window handle, and webview page registered over
the debug port. The gap is under 60 ms, so the table uses the first to stay comparable with earlier
releases.

| Aspect                 | Measured                   | PRD budget                        |
| ---------------------- | -------------------------- | --------------------------------- |
| Desktop cold start     | 0.64 s median (0.61-0.86)  | under 1.5 s                       |
| Desktop idle RAM       | 201.5 MB private median    | under 220 MB                      |
| Idle CPU               | 0.04%                      | near zero                         |
| Processes at idle      | 7 (1 app, 6 WebView2)      | no extra process for the widget   |
| Installer              | 4.89 MB MSI, 3.91 MB NSIS  | under 30 MB                       |
| Android APK            | 7.5 MB arm64 (24.6 MB all) | under 25 MB                       |
| Initial JS bundle gzip | 250.0 KB                   | 250 KB or less                    |
| Initial CSS gzip       | 9.5 KB                     | not capped                        |
| Search over 5,000 rows | 15 ms                      | under 200 ms on low-spec hardware |
| Layout, 500 cards      | 57 ms (was 234 ms)         | -                                 |
| Layout, 4,001 cards    | 54 ms                      | -                                 |

Long lists are not DOM-virtualised. Rows outside the viewport are skipped by the browser through
`content-visibility: auto` with `contain-intrinsic-size`, which brought layout cost back under
budget without adding a state layer to the frontend.

The initial JS bundle now sits at the 250 KB ceiling. Adding the two language dictionaries and
i18next moved it from 220 KB to just under 250 KB. Any further dependency, or a third language
bundled the same way, crosses the budget and needs an explicit decision first (see AGENTS.md
section 6): split the dictionaries into lazily loaded chunks, or raise the limit.

Visual verification runs against the real build, not tokens on paper: a contrast audit reads the
colours actually painted. Light mode across collection, empty states, relative timestamps, and the
detail screen measured 25 elements with a floor of 7.78:1 and zero WCAG failures. Dark mode measured
23 elements with a floor of 6.72:1. In widget mode the bar and its icons land between 16.29:1 and
18.37:1 in both themes, and row text stays at 8.13:1 even when the backdrop is computed as pure
black.

---

## Platform status

**Desktop.** Every Must and Should item in the PRD is implemented, including widget mode, tray,
global shortcuts, acrylic transparency, and the `.promptsaver` file association.

**Android.** Scaffolded under `src-tauri/gen/android`, and verified on an API 36 x86_64 emulator:
the UI renders with correct fonts and safe-area insets (52 px top measured), the contrast audit
passes with zero failures, export writes to the app exchange folder and lists it back, a `content://`
URI from another app is copied into that same folder and offered as an import, the weekly backup is
created on startup, and the hardware back button walks the screen stack before leaving the app. A
debug build on that emulator reaches the first frame in about 2.0 s; a release build on physical
hardware is still unmeasured.

**iOS.** Out of scope for this project. The mobile target is Android only.

Still open:

- F4 app lock and at-rest encryption (Could). Needs a security decision first: where the key lives,
  what happens when it is forgotten, and what it means for exported files and backups.
- Release signing: the Android keystore and the Windows code-signing certificate are deliberately
  kept outside this repository.
- The share sheet is not wired up, so exporting on mobile writes to the app folder rather than
  handing the file to another app directly.

---

## Widget mode

The widget is a mode of the same `utama` window, not a second window and not a second process. Mode
is read from the window size: the default is 288 x 360 logical pixels inside a 260 x 280 to
420 x 760 band, and a stored geometry outside that band is discarded in favour of the default.

The content is deliberately small: a search field, one "Favourite" filter chip, a quick-add button,
the prompt list, and a copy action per row. The favourite button and the Recently/Sessions tabs were
removed, and the transparency stepper moved into Settings so the bar still fits at 288 px.

Four real defects were found on device and fixed:

- `masuk_mode_widget` held the `Mutex<Connection>` guard and then called `simpan_geometri`, which
  locked the same mutex. The mutex is not reentrant, so the main thread waited on itself and Windows
  marked the app "Not Responding" every time the widget opened. `StateAplikasi::dengan_koneksi` now
  guarantees the guard is released first.
- Geometry was saved from `outer_size` but restored through `set_size`, which sets the inner size.
  On Windows 11 the outer rect includes an invisible resize frame, so the window grew every session
  (measured 304, 318, 334, 363). Both sides now use the inner size.
- Widget rows lacked `min-w-0` on the grid item, so a long title pushed the copy button off screen
  and produced horizontal scroll.
- Bar icons were invisible in light mode until hovered. Two causes: a `className` was passed into
  the cva variants object instead of to `cn()`, so callers' colour classes were dropped, and the
  ghost variant painted black text on the black bar. There is now a dedicated `bilah` variant and
  `Tombol` composes `cn(tombolVariants(...), className)`.

Extra RAM in widget mode measured negative: 185.9 MB private as a widget against 202.0 MB as a full
window in the same session. Escape and the close button both call the `sembunyikan_widget` command,
so there is one hide path. Note for future measurements: `MainWindowHandle` and
`document.visibilityState` are not evidence that a window is hidden in this app; use a screen capture.

---

## Automatic backups

Once a week, when the app starts, the current collection is written to
`<app data>/cadangan/cadangan-YYYY-MM-DD-HHMMSS.promptsaver`. Only the five newest files are kept.
A backup uses the same format as an export, so there is no second schema to keep in sync, and an
empty collection is not backed up.

Restoring from Settings runs the existing import path: atomic, with the same conflict strategy the
user chooses for any imported file. No code path replaces the database silently. The behaviour can
be switched off in Settings, and "erase all data" offers to delete the backup and exchange folders
as well, because those files are plaintext copies of the whole collection.

---

## App lock

Settings can turn on a PIN lock (PRD F4). The PIN is 4 to 12 digits and is never stored: the app
keeps a PBKDF2-HMAC-SHA256 hash (60,000 iterations) with a random per-installation salt, derived by
code in `src-tauri/src/features/kunci/service.rs` so no extra crate is needed and the project still
builds offline.

The lock is enforced in the backend, not only in the view. While the gate is closed every command
that reads user data returns the `terkunci` error, so the PIN screen is enough to protect the
collection — there is no hidden list of prompts in the DOM waiting to be revealed.

When it asks for the PIN:

- on every start, if a PIN is set;
- on desktop, after the main window has lost focus for the chosen delay (0 to 3600 seconds, 60 by
  default). The window is minimised and its content is marked protected, so it does not appear in
  taskbar previews or screenshots while locked;
- on Android, when the app moves to the background, because there is no reliable window focus
  event there;
- immediately when the "Lock now" button is pressed.

Five wrong attempts start a 60-second wait before the next try. The lock rows are excluded from
"reset to defaults", so one click there cannot remove the PIN — measured on the release build: after
resetting settings the app still asked for the PIN on the next start.

Fingerprint unlock on Android goes through the official `tauri-plugin-biometric`. The verification
happens in Rust (`buka_kunci_biometrik`), never in JavaScript, so the view cannot claim it is
authenticated. The button only appears when the plugin reports a usable enrolled sensor; the PIN
stays the primary path and a cancelled fingerprint prompt costs nothing (it does not consume a PIN
attempt). No npm guest binding is used, so the lock adds nothing to the JS bundle.

What it does not do: it does not encrypt the database or the export files. A lock protects the
person sitting at an unlocked device, not someone who copies the files away. That limit is stated
in the app's own Privacy page.

---

## Privacy

No network requests originate from the application. The `INTERNET` permission is absent from the
release Android manifest and lives only in `src/debug/AndroidManifest.xml` for the dev server. The
content security policy in `tauri.conf.json` allows only self and Tauri IPC. Capabilities follow
least privilege, and the filesystem scope is limited to locations the user picked in a dialog plus
the app data directory.

Prompt bodies are never written to logs or the console. Exported and backed-up files are plaintext
and unencrypted, and the app states that warning in the interface. Database encryption is not part
of this release. The PIN lock (see [App lock](#app-lock)) gates access inside the running app; it is
not encryption and does not protect files copied off the device.

There are no secrets in this repository. Do not commit `.env`, keystores, or signing credentials.

---

## Known gaps

Honest status of what has and has not been measured, so nobody reads this README as a promise:

| Item                      | State                                                                                                                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Android on a real device  | Not done. The APK has only been run on the Android Studio emulator (API 34), including the file-exchange and back-button paths.                                                                                                                                                                  |
| Fingerprint unlock        | Compiles and is wired, but the happy path is untested. The emulator has no enrolled fingerprint, so it correctly hides the button; a device with a registered biometric is needed.                                                                                                               |
| Desktop auto-lock trigger | The delay, the gate, and the lock screen were measured end to end on the release build (locked 19 s after the scheduler ran with a 15 s delay). The `Focused(false)` event itself was not exercised because the Windows session stayed locked during the test, so no real focus change happened. |
| Signed release APK        | Not done. No keystore exists for this project, so releases are debug-signed and cannot be installed on a production device yet.                                                                                                                                                                  |
| iOS                       | Out of scope by decision. `pnpm tauri ios init` was never run and no iOS-specific code exists.                                                                                                                                                                                                   |
| Database encryption       | Not implemented. The SQLite file and every export stay plaintext; see the Privacy page.                                                                                                                                                                                                          |
| Lock on shared accounts   | Not applicable by design (there is no account), but note that one PIN covers the whole database file on that device profile.                                                                                                                                                                     |
| Language coverage         | English and Indonesian only. Interface strings come from `src/lib/i18n/sumber/`; backend validation messages stay Indonesian and are mapped for display.                                                                                                                                         |
| Bundle budget             | Initial JS is 245.35 kB gzipped against the 250 kB budget in PRD section 5 (254.59 kB with the CSS). The lock added no npm dependency, so the budget still holds.                                                                                                                                |
