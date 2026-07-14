# Mobile Experience — Design

**Date:** 2026-07-11
**Branch:** `mobile-experience`
**Status:** Approved for planning

## Problem

Desktop earns its feel through per-section signature interactions (pinned horizontal Work timeline, split-pane Projects terminal, Music deck + visualizer). Mobile currently linearizes everything into a document:

- **Work** degrades to a ~4,450px vertical wall — all 7 roles fully expanded with every resume bullet visible (~5.5 screens of uninterrupted text, zero interaction). The subcopy still says "Scroll the timeline," which no longer describes anything.
- **Projects** stacks the file list above the README, burying the relationship between the two panes. Descriptions truncate with ellipses.
- **Music** translates best but is self-contained; audio stops mattering the moment you scroll away.
- **Hero** holds up but pushes the first real section ~1.5 screens down.
- Total page height on a 375px viewport: ~9,000px, roughly half of it the Work wall.

The atmosphere survives on mobile; the interactivity dies.

## Decisions (from brainstorm)

1. **Scope:** mobile-native redesign *per section* — keep the single-scroll page and section structure; no separate mobile experience or entry flow.
2. **Interaction vocabulary:** embrace swipe + tap. Sections may own horizontal swipe zones and tap-to-expand. Vertical page scroll is never hijacked — no scroll-jacking, no pinning on mobile.
3. Each section keeps a *distinct* mechanic (same rule as desktop): Work owns horizontal swiping, Projects is tap-driven navigation, Music owns the docked player.

## Breakpoint strategy

Same DOM, same `data.js` content — no forked mobile tree. Mobile mechanics activate at the existing narrow breakpoints where the desktop mechanics already switch off (Work timeline currently switches around 900px; the new mechanics replace the current fallback there). Gesture-specific affordances (swipe hints, touch sizing) key off `(pointer: coarse)`; layout keys off viewport width.

Desktop at ≥ 1280px must be pixel-unchanged. This branch only adds below-breakpoint behavior.

## 1. Work — swipe timeline deck

The desktop mechanic is "travel horizontally through time." The mobile translation is a swipe, not a wall.

- **Layout:** horizontal scroll-snap rail (`scroll-snap-type: x mandatory`), one full-width card per role. Card shows: org logo, big year, title, org, mono date/location line, and a 1–2 line summary.
- **Progressive disclosure:** resume bullets and stack chips sit behind a tap-expand inside the card — same chevron language as the rest of the site, ≥ 44px target, 320ms ease-out expand. Collapsed by default.
- **Wayfinding:** below the rail, the `01 / 07` mono counter plus a thin terracotta year-progress line that fills as the user swipes. Counter/progress update via IntersectionObserver on the cards — cheap, passive.
- **Copy:** section subcopy says "Swipe" instead of "Scroll" below the breakpoint.
- **Accessibility:** the rail is a semantic list; cards focusable; horizontal region labeled; keyboard arrow/tab traversal works via native scroll-snap behavior; expand controls are buttons.
- **No scroll-jacking:** vertical page scroll passes through untouched; only deliberate horizontal swipes move the rail.

Expected effect: Work drops from ~4,450px to roughly one viewport, and the timeline through-line survives.

## 2. Projects — single-pane terminal

Real terminals are single-pane; the desktop split view is a desktop luxury. Below the breakpoint the terminal becomes one pane with two views managed in React state (`view: 'list' | 'reading'`):

- **List view (default):** the existing `$ ls projects/` listing, full width.
- **Tap a project:** a brief `$ cat <name>/README.md` command line plays, then the README slides in and replaces the listing (320ms ease-out, same easing family site-wide).
- **Back:** a persistent `$ cd ..` row pinned at the top of the README view returns to the listing.
- **Scroll containment:** README keeps its internal scroll with a max-height so page scroll never gets trapped inside the terminal (builds on the existing mobile-scroll handling from the prior terminal work).
- Desktop split-pane behavior untouched.

## 3. Music — sticky mini-player

When a track is playing and the music block leaves the viewport (IntersectionObserver on the block), a slim bar docks to the bottom of the screen:

- **Contents:** track title, a few live equalizer bars fed by the existing analyser, play/pause button (≥ 44px).
- **Behavior:** tapping the title smooth-scrolls back to the deck; the bar hides when playback is paused/ended or the music block is in view.
- **Details:** respects `safe-area-inset-bottom`; equalizer animation disabled under `prefers-reduced-motion` (static bars); bar uses `--card` surface + 1px `--rule` top border — no new visual vocabulary.

## 4. Hero + performance

- Tighten mobile vertical rhythm: smaller photo frame, tighter block padding, so the first swipe lands on real content (Work reachable within ~1 screen of the fold).
- Ambience canvas: cap `devicePixelRatio` and particle count on small viewports to protect mobile GPUs/battery.

## Error handling / degradation

- No JS-dependent content: all role/project/track data renders regardless; JS only adds mechanics (counter, view switching, mini-player).
- `prefers-reduced-motion`: no slide/expand animations (instant state changes), no equalizer motion, existing canvas/pulse rules continue to apply.
- If IntersectionObserver is unavailable (not a realistic target, but): mini-player simply never docks; counter falls back to scroll listener.

## Testing / verification

Manual pass in the browser pane at 375×812 (and 768px tablet):

1. Swipe the full Work timeline end to end; counter and progress line track; tap-expand bullets on ≥ 2 cards; vertical scroll never traps.
2. Projects: enter and leave ≥ 2 READMEs via tap / `$ cd ..`; internal README scroll works; page scroll never traps.
3. Play a track, scroll away → mini-player docks; pause → hides; tap title → returns to deck.
4. Reduced-motion pass (emulate in devtools): no slides, no equalizer motion.
5. Touch-target audit: all new controls ≥ 44px.
6. Desktop regression: 1280px viewport is visually unchanged.

## Out of scope

- Any desktop-layout changes.
- New sections, content changes beyond the Scroll→Swipe copy swap.
- Bottom-sheet patterns, story-style navigation, or a separate mobile entry flow (considered, rejected in brainstorm).
