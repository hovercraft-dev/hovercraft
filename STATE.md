# Project State

Last updated: 2026-07-11, end of the Claude Code cloud session that did the
v1 → v2 rewrite and redesign.

This file is a handoff note: what exists right now, what's deployed where,
and what to do next when picking this up on the NAS (or anywhere else
outside the cloud sandbox this was built in).

## Where the code is

- **`main`** — currently at commit `26ad305` ("Design overhaul with animated
  aircraft on approach"). This *is* the new v2 rewrite + redesign. It was
  fast-forwarded directly onto `main` from the feature branch — nothing was
  squashed or rewritten, so `git log main` shows the real history.
- **`backup/pre-redesign-v1`** — the old vibe-coded original, frozen at
  commit `505d3cd`, exactly what `main` pointed at before this session
  touched anything. This is the rollback target if v2 ever needs to be
  reverted: `git push origin backup/pre-redesign-v1:main --force`.
- **`claude/fork-refactor-repo-on8gnx`** — the working branch this was all
  built on. Identical tip to `main` right now. Safe to delete once you've
  confirmed `main` is good, or keep it around as a second pointer — your
  call.

There is no open pull request. Both rewrite commits were pushed straight to
`main` after end-to-end testing, at your request, to unblock checking the
live result without a review step.

## What changed, in one paragraph

The original was a single 600-line `script.js` with inline `onclick`
handlers and `innerHTML` string-building (broke on runway names containing
a quote character). It's now a small set of plain ES modules — pure
calculation logic separated from DOM code, unit tested — with no build
step, no framework, no dependencies. Same two tools (baggage splitter,
crosswind calculator), same numbers, same operational limits, same
`localStorage` keys so existing installs keep their data. Then a visual
redesign on top: segmented tab bar, refined card/input styling, an
instrument-style wind diagram with an aircraft that actually flies the
approach and crabs into the wind by the real drift angle. Full details in
`ARCHITECTURE.md`.

## Is it actually live anywhere?

Unknown from here — this session never had visibility into your GitHub
Pages settings (no Pages workflow file exists in the repo, which usually
means Pages, if configured at all, is set up via the repo's Settings tab
rather than Actions). Check **Settings → Pages** on the GitHub repo:

- If it's already pointed at `main`, it will have rebuilt automatically
  within a minute or two of the push and you can just visit the Pages URL.
- If it's not configured, and GitHub Pages is how you want to serve this,
  turn it on there (branch `main`, folder `/`).

If the "live" copy is actually something else — e.g. served from the NAS
itself, or from a different host — that's the thing to point at this repo
next.

## Picking this up on the NAS

This was built and tested inside a cloud sandbox that had Node 22, Python
3, and a headless Chromium preinstalled. None of that is guaranteed to
exist on a Synology NAS. What you actually need:

1. **Clone or pull `main`** onto the NAS.
2. **Serve the repo root over HTTP.** The app is static files with ES
   modules (`<script type="module">`) and a service worker — both require
   a real HTTP origin, not `file://`. Any of these work:
   - `python3 -m http.server 8000` from the repo root (matches
     `npm run serve`, if Python 3 is available on the NAS)
   - Synology **Web Station** pointed at the repo folder as a static site
   - any other static file server (nginx, Caddy, `npx serve`, etc.)
3. **Unit tests are optional at this stage** — they're Node's built-in
   `node:test`, zero npm dependencies, run with `npm test` (needs Node
   18+). If the NAS doesn't have Node, that's fine; the app itself needs
   nothing but a static file server. Run the tests from a dev machine that
   does have Node before pushing changes, or install Node via Synology's
   Package Center.
4. **For real device testing**, HTTPS matters: the service worker (offline
   caching, "add to home screen") only registers on `https://` or
   `localhost`. Plain `http://<nas-ip>:8000` from a phone will run the app
   fine but won't let you test the offline/installed-PWA path. If that
   matters, put the NAS behind a reverse proxy with a certificate
   (Synology's built-in reverse proxy + Let's Encrypt, or your existing
   setup) before testing that specific behavior.

## Known open item

`RUNWAY_CONDITIONS` in `src/lib/wind.js` has RCAM codes 3 and 2 both set to
a 16 kt crosswind limit — carried over unchanged from the original app. It
reads like it could be a typo in the source data (each RCAM code usually
gets a distinct limit) but wasn't touched since it wasn't part of the
requested work and there's no way to confirm the correct value for code 2
from inside this session. Worth checking against the AFM/FCOM table you're
actually flying by before trusting it operationally.

## Everything else

See `README.md` for day-to-day dev commands, `ARCHITECTURE.md` for how the
code is organized and why, and `SPEC.md` for a menu of follow-on work if
you want to keep developing this.
