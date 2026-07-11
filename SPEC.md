# Development Spec / Roadmap

A menu of follow-on work, not a commitment. Organized by priority tier.
Each item has enough detail to act on without this session's context —
file paths, the actual change, and why it's worth doing.

Nothing here has been started unless the item says so explicitly.

## Before anything else: confirm the data

- **Resolve the RCAM code 2 vs 3 crosswind limit.** `src/lib/wind.js`,
  `RUNWAY_CONDITIONS`, both code `3` ("Medium") and code `2` ("Medium to
  Poor") are set to 16 kt. This was carried over unchanged from the
  original app and flagged in `STATE.md` — it looks like it could be a
  transcription error (each RCAM code usually has a distinct limit) but
  nobody has confirmed the correct value against the actual FCOM/OM table.
  This is a one-line fix once you know the right number, and it's the
  highest-value fix on this list because it's a real limit, not a design
  choice.

## Tier 1 — safety net for a tool used on the line

- **Commit the Playwright end-to-end script into the repo.** Development
  used a throwaway script (in the cloud sandbox's scratchpad, not in the
  repo) that drove the whole app in headless Chromium: both split options,
  gust-vs-limit logic, the runway editor (including a name with a `"` in
  it, which broke v1), persistence across reload, dark mode, and service
  worker registration. Bringing a trimmed version of that into
  `test/e2e/app.spec.js` with `playwright` as a devDependency and an
  `npm run test:e2e` script means every future change gets the same
  coverage this rewrite got, without re-deriving it by hand. This is the
  single highest-leverage addition to the test suite — `test/*.test.js`
  only covers `src/lib`, not the DOM wiring in `src/ui`.
- **CI on push/PR.** A GitHub Actions workflow
  (`.github/workflows/ci.yml`) running `npm test` (and `npm run test:e2e`
  once it exists) on every push and PR. Zero dependencies to install
  beyond Node itself for the unit tests; the e2e job would need
  `playwright install --with-deps chromium`. This repo currently has *no*
  CI at all — right now the only thing standing between a bad change and
  `main` is manual testing.
- **A CHANGELOG.** Even a short one. This app updates in place on
  installed devices via the service worker cache bump — a one-line note
  per `CACHE_NAME` bump ("v9: fixed RCAM code 2 limit to X kt") gives
  anyone using it a way to know what changed without diffing commits.

## Tier 2 — genuinely useful next features

- **Multiple aircraft profiles.** Everything wind/baggage-related is
  currently ATR 72-600-specific and hardcoded (`APPROACH_SPEED_KT` in
  `wind.js`, the RCAM table, the cargo hold artwork). If this needs to
  cover a second type someday, the natural seam is a small
  `src/lib/aircraft-profiles.js` exporting an array of
  `{ id, name, approachSpeedKt, cargoHolds: [...], ... }`, with a profile
  picker added to the header. Don't build this speculatively — only do it
  when a second aircraft type is actually needed, since right now every
  number in the app is tuned to one type and a profile switcher without a
  second real profile is just indirection.
- **Editable runway condition limits.** `RUNWAY_CONDITIONS` in
  `wind.js` is a fixed table. If crosswind limits ever need to vary by
  operator/aircraft config rather than being fixed constants, this would
  move into `store.js`-backed state with `RUNWAY_CONDITIONS` as the
  default, following the exact pattern already used for `runways`. Same
  caveat as above — only worth it if the limits actually need to change
  per install, not as a default extensibility hook.
- **History / last-used values.** The app currently resets on reload
  except for saved runways and theme. A "remember my last wind entry"
  toggle (also via `store.js`) would help for back-to-back sectors on the
  same runway. Small, low-risk addition.
- **Print / share a result.** A share button that formats the current
  crosswind assessment or baggage split as plain text (for a quick
  message to ops or a logbook note) — `navigator.share()` with a
  `navigator.clipboard.writeText()` fallback. No new dependencies needed.

## Tier 3 — polish, only if there's appetite

- **Diagram theme toggle.** Right now the wind diagram is deliberately an
  "instrument face" — always dark, in both light and dark app themes (see
  `styles.css`, the `--dg-*` custom properties, set once at `:root` and
  once under `.dark-mode` but with the same dark values). If that reads as
  a bug rather than a design choice once it's actually flown with, making
  the diagram follow the app theme is a CSS-only change: give `.dark-mode`
  a second set of `--dg-*` values distinct from the light set (currently
  they're identical — search `styles.css` for `--dg-`).
- **Configurable approach speed.** `APPROACH_SPEED_KT` (115 kt) in
  `wind.js` only affects the cosmetic crab angle in the animation, never a
  limit. Could become an optional input if pilots want the animation to
  reflect actual planned Vapp instead of a fixed representative value —
  genuinely low priority since it changes nothing about the numbers that
  matter.
- **Second aircraft silhouette style.** `drawAirplane()` in
  `src/ui/diagram.js` draws a simple top-down polygon. Purely cosmetic;
  not worth touching unless someone specifically wants a different look.

## Explicitly not recommended

- **Don't add a build step (bundler/transpiler) unless the app outgrows
  plain ES modules.** The zero-build-step property is a feature for this
  use case (see `ARCHITECTURE.md`) — it means "edit a file, reload" stays
  true on the NAS with no tooling installed. Only reconsider this if the
  module count or a genuine need for e.g. TypeScript makes it worth the
  tradeoff.
- **Don't add a framework (React/Vue/etc.) for two tools and a canvas.**
  The current `lib`/`ui` split already gives clean separation and full
  testability of the logic; a framework would mostly add ceremony here.
- **Don't build the aircraft-profile or configurable-limits abstractions
  ahead of a second concrete need** (see Tier 2 notes above) — YAGNI
  applies directly to both.

## How to pick this up

1. Read `STATE.md` for exactly where the code and branches stand.
2. Read `ARCHITECTURE.md` for how the pieces fit together and where a
   given kind of change belongs.
3. Pick one item from this file — Tier 1 first if you want the safety net
   in place before changing behavior, otherwise whatever's actually
   bothering you in daily use.
4. Same workflow as this session: change `src/lib` + its test first if the
   change touches a formula or a limit, then wire it up in `src/ui`, then
   bump `CACHE_NAME` in `sw.js` before shipping.
