# Hovercraft's ATR 72-600 Flight Tools

Offline-first PWA with two tools for ATR 72-600 line operations:

- **Bags** — splits a baggage load between the FWD and AFT holds, either by
  a target FWD bag count or a target FWD weight (converted to whole bags
  using the average bag weight).
- **Wind** — decomposes reported wind into crosswind and head/tailwind
  components for a runway heading, checks them against operational limits,
  and draws the situation on a compass diagram. Runway headings can be
  saved for one-tap recall.

> **Disclaimer:** informal aid only. Always refer to the AFM/FCOM and your
> operator's OM for the authoritative limits and procedures.

## Operational limits used

| Limit | Value |
| --- | --- |
| Tailwind | 10 kt |
| Headwind | 55 kt |
| Crosswind, RCAM 6 (Dry) | 35 kt |
| Crosswind, RCAM 5 (Wet / Good) | 28 kt |
| Crosswind, RCAM 4 (Good to Medium) | 22 kt |
| Crosswind, RCAM 3 (Medium) | 16 kt |
| Crosswind, RCAM 2 (Medium to Poor) | 16 kt |
| Crosswind, RCAM 1 (Poor) | 10 kt |

When a gust is entered and exceeds the sustained speed, the limit check is
made against the gust components; the sustained components stay on display
with the gust values underneath.

The limits live in one place: `src/lib/wind.js`.

## Structure

Plain ES modules — no framework, no build step. Deploy by serving the
repository root over HTTPS (GitHub Pages works as-is).

```
index.html          App shell (markup only, no inline scripts)
styles.css          Theme variables (light/dark) and layout
sw.js               Service worker: pre-cache + stale-while-revalidate
manifest.json       PWA manifest
assets/             Icons and artwork
src/
  main.js           Entry point: wires panels, theme, tabs, SW
  lib/              Pure calculation logic (no DOM, unit tested)
    wind.js         Components, limits, RCAM table, runway designators
    baggage.js      FWD/AFT split math
    store.js        localStorage persistence (runways, theme)
  ui/               DOM controllers
    wind-panel.js   Calculator + runway quick-select/editor
    bags-panel.js   Baggage splitter
    diagram.js      Canvas compass/runway/vector drawing
    theme.js        Dark mode toggle
    tabs.js         Tab switching
test/               Unit tests for src/lib (node:test)
```

## Development

```sh
npm test        # unit tests (Node 18+, no dependencies)
npm run serve   # serve on http://localhost:8000
```

The service worker caches aggressively for offline use: bump `CACHE_NAME`
in `sw.js` whenever you ship a change, or clients will keep serving the
old version.

Saved runways and the theme preference are stored under the same
localStorage keys as v1 (`atr72_runways`, `atr72_theme`), so existing
installs keep their data across the upgrade.
