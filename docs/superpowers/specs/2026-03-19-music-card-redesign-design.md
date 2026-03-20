# Music Card Redesign — Stitch-Inspired Hybrid

**Date:** 2026-03-19
**Approach:** Targeted Refactor (CSS + light JS touch)
**Origin:** Google Stitch MCP generated a music gallery screen; adapting select visual ideas into the existing SoundCloud-powered music section.

## Summary

Redesign the music tab's track cards from a single-column list with small 96px art to a responsive 2-column grid (desktop) / 1-column (mobile) layout with 160px album art, decorative waveform bars that double as the progress indicator, and a luminosity effect on non-playing track artwork.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Layout | 2-col grid desktop (>768px), 1-col mobile |
| Album art size | 160px desktop, 96px mobile |
| Art effect | `mix-blend-luminosity` + `grayscale(1)` on idle tracks; full color on playing track |
| Progress indicator | Waveform bars (16 per card, randomized heights). Bars left of playhead get `.waveform-bar--active` (accent color). Replaces both old eq bars and single-fill progress bar |
| Hover effect | Keep existing radial gradient `::before` overlay. No additional flat overlay |
| Scrubbing | Click position on waveform area maps to seek position (same logic as current progress bar) |

## What Changes

### CSS (`style.css`)
- `.music-content`: Change from `flex-direction: column` to `display: grid; grid-template-columns: 1fr 1fr` with `1fr` fallback at 768px breakpoint
- `.sc-track-card`: Change `grid-template-columns` from `28px 96px 1fr minmax(48px, auto)` to `160px 1fr` (remove track number column and play button column — play button moves inside `__body`)
- `.sc-track-card__art`: Width/height from 96px to 160px; add `img` styles for luminosity. Note: test `mix-blend-mode: luminosity` with `border-radius` + `overflow: hidden` in Safari, as compositing can behave differently.
- Remove `.sc-track-card__num`, `.sc-track-card__num-text`, and all hover/playing states for `__num` — track numbers are removed entirely
- Remove `.sc-track-card__eq`, `.sc-track-card__eq-bar`, `@keyframes eqBounce` — replaced by waveform
- Remove `.sc-track-card__progress-wrap`, `.sc-track-card__progress-scrub`, `.sc-track-card__progress-track`, `.sc-track-card__progress-fill` — replaced by waveform bars
- Add `.sc-track-card__waveform`, `.waveform-bar`, `.waveform-bar--active`
- Playing state: `.sc-track-card--playing .sc-track-card__art img` removes luminosity filter
- 768px breakpoint: 1-col grid, art shrinks to 96px, card grid to `96px 1fr`
- 480px breakpoint: art shrinks to 64px, card grid to `64px 1fr`, smaller padding. Replaces the old 520px breakpoint rules (which referenced the removed 4-column grid)

### JS (`scripts.js`)
- **Card builder function**: Remove track-number div (`sc-track-card__num`, `__num-text`, `__eq`, `__eq-bar`) entirely
- **Card builder function**: Remove old progress-wrap/scrub/track/fill HTML
- **Card builder function**: Add 16 waveform-bar divs inside a `.sc-track-card__waveform` container. Heights randomized once at build time (20-90%) and persisted for the card's lifetime (so pausing/resuming does not change the waveform shape)
- **Card builder function**: Move play button inside `__body`, below the waveform in a controls row alongside the "Open in SoundCloud" link
- **Card builder function**: Keep `.sc-track-card__times` (elapsed/total) positioned below the waveform container
- **Progress update logic**: Instead of setting `width%` on a fill div, calculate which waveform bars should be active based on `(currentTime / duration)` and toggle `.waveform-bar--active` on bars to the left of the playhead
- **Scrub/seek logic**: Click on `.sc-track-card__waveform` calculates position as fraction of container width, seeks to that position (same math as current scrub)
- **ARIA**: The waveform container inherits the current progress-wrap's ARIA attributes: `role="slider"`, `tabindex="0"`, `aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`. The `aria-valuenow`/`aria-valuetext` update logic carries over unchanged.
- **Scrub hint**: Adapt the existing scrub-hint tooltip to work over the waveform area

### HTML (`index.html`)
- No changes needed — cards are dynamically built by JS

## What Does NOT Change

- SoundCloud Widget API integration (iframe, SC.Widget bindings)
- Play/pause state management
- Loading shimmer animation (`.sc-track-card--loading`)
- Error handling (fallback message)
- Stagger entrance animation (anime.js)
- ~~Track number display~~ — **removed** (see CSS/JS changes above)
- Visualizer toggle button
- `aria` attributes and accessibility patterns
- `prefers-reduced-motion` support
- Open in SoundCloud link

## Responsive Breakpoints

- **>768px (desktop)**: 2-column outer grid, card grid `160px 1fr`, full waveform
- **<=768px (tablet/mobile)**: 1-column outer grid, art shrinks to 96px, card grid `96px 1fr`
- **<=480px (small mobile)**: Art shrinks to 64px, card grid `64px 1fr`, reduced padding. This replaces the old 520px breakpoint which referenced the now-removed 4-column card grid

## Testing

- Verify all 7 SoundCloud tracks load metadata and artwork
- Verify play/pause toggles correctly, only one track plays at a time
- Verify waveform progress updates in real-time during playback
- Verify click-to-seek on waveform bars works
- Verify luminosity effect: idle tracks desaturated, playing track full color
- Verify hover glow on cards
- Verify responsive: 2-col at desktop, 1-col at mobile
- Verify loading shimmer appears before SC metadata loads
- Verify error state if SoundCloud fails to load
- Verify `prefers-reduced-motion` disables transitions
- Verify scrub hint tooltip works on waveform hover
- Verify keyboard arrow keys can seek within the waveform area (inherits slider role)
- Verify 480px breakpoint: art at 64px, reduced padding, single column
- Verify luminosity effect renders correctly in Safari (border-radius + overflow + mix-blend-mode compositing)
