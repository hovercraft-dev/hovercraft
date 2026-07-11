# Architecture

How this app is put together, and why it's put together that way.

## Design constraints that shaped everything

- **No build step.** `index.html` loads `src/main.js` as a native ES
  module (`<script type="module">`), which imports the rest with plain
  `import`. There's no bundler, no transpiler, no `node_modules` the
  browser needs at runtime. You edit a `.js` file and reload the page.
  This matters for a tool that's used on the line: fewer moving parts
  between "I changed the code" and "the change is live."
- **No framework, no runtime dependencies.** `package.json` has zero
  `dependencies` — only `devDependencies`-free `scripts`. The DOM is
  touched directly. For an app this size (two calculators and a canvas
  diagram) a framework would add indirection without buying anything.
- **Offline-first PWA.** A service worker (`sw.js`) pre-caches the app
  shell and serves cache-first with a background refresh, so it works
  with no signal — the scenario it's actually used in.
- **Same data contract as v1.** `localStorage` keys (`atr72_runways`,
  `atr72_theme`) are unchanged, so upgrading an installed PWA in place
  doesn't lose a pilot's saved runways or theme preference.

## Directory layout

```
index.html          App shell — markup only, zero inline scripts/handlers
styles.css           All styling: CSS custom properties for both themes,
                     plus the diagram's instrument-panel palette
manifest.json        PWA manifest (icons, standalone display, theme color)
sw.js                Service worker: cache-first + stale-while-revalidate
assets/
  atr-profile.png    Side-profile artwork for the Bags tab
  icon-192.png
  icon-512.png       App icons

src/
  main.js            Entry point. Wires the two panels together, starts
                     theme + tabs, registers the service worker.
  lib/                Pure logic — no DOM references anywhere in this
                     directory. Every function here is unit tested.
    wind.js          Wind component math, RCAM limit table, limit
                     checking, runway designator formatting, drift-angle
                     calculation for the approach animation.
    baggage.js       FWD/AFT bag-and-weight split math.
    store.js         The only file that touches localStorage. Owns key
                     names, default values, and defensive JSON parsing.
  ui/                 DOM controllers. Each one owns one piece of the
                     page and talks to src/lib for any actual math.
    theme.js         Dark-mode toggle, persists via store.js.
    tabs.js          Tab switching (Bags ⇄ Wind), tells the wind panel
                     when to start/stop its animation.
    bags-panel.js    Wires the Baggage Splitter card's inputs/buttons.
    wind-panel.js    Wires the Crosswind Calculator card: inputs, the
                     RCAM select, the runway quick-select bar + inline
                     editor, and drives the canvas diagram.
    diagram.js       Canvas rendering: compass rose, runway tarmac, wind
                     vector, component vectors, and the animated aircraft
                     on approach.

test/
  wind.test.js       Unit tests for src/lib/wind.js (node:test)
  baggage.test.js    Unit tests for src/lib/baggage.js
```

The `lib` / `ui` split is the one architectural rule that actually matters
here: **calculation code has no DOM dependency and is fully testable in
Node; DOM code does no math of its own.** If you're adding a feature and
you're not sure where it goes, that's the test — "does this involve a
formula or a limit?" → `lib`. "Does this touch an element?" → `ui`.

## Module responsibilities, in more detail

### `src/lib/wind.js`

The source of truth for every number and limit in the crosswind
calculator:

- `TAILWIND_LIMIT_KT` / `HEADWIND_LIMIT_KT` — fixed operational limits.
- `RUNWAY_CONDITIONS` — the RCAM code → crosswind-limit table. The `<select>`
  in the Wind tab is *generated* from this array in `wind-panel.js`, so
  adding/editing a condition here is the only change needed.
- `windComponents(runwayHdg, windDir, speedKt)` — decomposes a wind report
  into `{ crosswindKt, headwindKt, side }`. `headwindKt` is negative for a
  tailwind. `side` is `'left' | 'right' | null`.
- `checkLimits(components, crosswindLimitKt)` — pure limit check, returns
  `{ withinLimits, violation }` where `violation` is
  `'crosswind' | 'tailwind' | 'headwind' | null`. Priority order matches
  the original tool (crosswind checked first).
- `assessWind({...})` — the one function `wind-panel.js` actually calls.
  Computes sustained components, and gust components when a gust exceeds
  sustained speed, and runs the limit check against whichever is worse.
- `driftAngleDeg(runwayHdg, windDir, speedKt, tasKt)` — crab angle for the
  approach animation. `asin(crosswind / tasKt)`, clamped to ±90° so an
  unrealistic input can't produce `NaN`. Defaults `tasKt` to
  `APPROACH_SPEED_KT` (115 kt, a representative ATR 72 Vapp) — this number
  is cosmetic, used only to angle the aircraft icon, and is never part of
  a limit check.
- `runwayNumber(hdg)` / `reciprocalHeading(hdg)` — heading ↔ runway
  designator conversions used by both the runway bar and the diagram.

### `src/lib/baggage.js`

- `averageBagWeight`, `splitByCount`, `splitByWeight` — all pure, all
  return `null` for a non-positive bag count (nothing to split). FWD count
  is always clamped to `[0, totalBags]`; AFT weight is computed as the
  *remainder* of total weight (`total - fwd`), not `aftBags * avg`, so the
  two holds always sum exactly to the entered total even when the average
  doesn't divide evenly.

### `src/lib/store.js`

Every `localStorage` read/write goes through here. Reads are defensive
(try/catch around `JSON.parse`, malformed entries fall back to defaults)
because this is a browser storage API — there's no schema enforcement
between app versions, and a corrupt or hand-edited value shouldn't crash
the app.

### `src/ui/diagram.js`

The most involved file, because it does three jobs at once:

1. **Static geometry** — compass ring, tick marks, cardinal/ordinal
   labels, the runway tarmac (rotated to the entered heading), threshold
   markings, runway numbers.
2. **Wind visualization** — the red wind arrow (from the compass edge,
   pointing inward — wind blows *from* that direction), plus dashed
   crosswind/headwind component vectors.
3. **The approach animation** — `initDiagram(canvas)` returns a small
   controller object (`{ update(state), setActive(bool) }`) that owns a
   `requestAnimationFrame` loop. The aircraft travels a fixed distance
   along the extended runway centerline over a ~7 second period, its nose
   offset by `driftAngleDeg()` so it visibly crabs into whatever wind is
   entered. The loop:
   - only runs while `setActive(true)` — `wind-panel.js` calls this from
     the tab-switch handler in `main.js`, so it's off while you're on the
     Bags tab;
   - checks `document.hidden` and `prefers-reduced-motion` on every frame
     and falls back to a static parked-aircraft frame if either is true;
   - re-syncs via a `visibilitychange` listener so backgrounding the tab
     actually stops the RAF loop instead of queuing invisible frames.

   All colors are read from CSS custom properties (`--dg-*`) via
   `getComputedStyle`, not hardcoded — the diagram is intentionally styled
   as an always-dark "instrument face" in both light and dark app themes
   (see `STATE.md` / `SPEC.md` if you want to change that), but the actual
   values live in `styles.css`, not in this file.

   The canvas backing store is sized to
   `clientWidth * devicePixelRatio` on every draw call, so it stays sharp
   on high-DPI phone screens without the CSS size changing.

### `src/ui/wind-panel.js`

Owns all the Wind tab's state that *isn't* persisted: current input
values, which runway chip is active, whether the inline runway editor is
open. Rebuilds the RCAM `<select>` from `RUNWAY_CONDITIONS` on init. The
runway editor builds real DOM nodes (`document.createElement`) rather than
`innerHTML` strings — the original v1 used string concatenation here,
which broke if a runway name contained a `"` character; that's fixed by
construction now, not by escaping.

### `src/ui/bags-panel.js`

Small state machine around "which of the two split options is active."
Typing in Option A (bag count) clears Option B's value and vice versa;
editing either total (bags or weight) recalculates using whichever option
still has a value. This was a deliberate behavior fix over v1, which
discarded the Option B target as soon as you touched a total field.

## Data flow, end to end

```
user input (DOM event)
        │
        ▼
  ui/*.js reads .value from inputs
        │
        ▼
  lib/*.js pure function(s) — wind.js or baggage.js
        │
        ▼
  ui/*.js writes results back into the DOM,
  and (wind panel only) calls diagram.update(state)
        │
        ▼
  ui/diagram.js redraws the canvas
```

Persistence is the one side channel: `store.js` is read on init (runways,
theme) and written on every edit (runway add/rename/reheading/delete,
theme toggle). Nothing else touches `localStorage`.

## Testing

`test/*.test.js` uses Node's built-in `node:test` + `node:assert/strict` —
zero dependencies, run with `npm test`. Coverage is limited to `src/lib`
by design: that's where the logic worth protecting against regression
lives (wind component math, limit priority, RCAM lookups, baggage split
rounding/clamping, the drift-angle formula). `src/ui` is exercised
end-to-end instead — see `SPEC.md` for a plan to bring the Playwright
script used during development into the repo as `npm run test:e2e`.

## Service worker / cache versioning

`sw.js` defines `CACHE_NAME` (currently `atr72-tools-v8`) and an explicit
`ASSETS` list. **Any time you ship a change to a cached file, bump
`CACHE_NAME`.** The `activate` handler deletes any cache whose name
doesn't match the current one, which is what actually pushes the update to
already-installed clients — without the bump, a phone with the PWA
installed will keep serving the old cached files indefinitely.
