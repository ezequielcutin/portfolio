# Music Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign music tab track cards with 2-col grid, larger art, waveform-as-progress bars, and luminosity effect on idle tracks — while preserving all SoundCloud playback functionality.

**Architecture:** CSS changes convert `.music-content` to a 2-col grid and restructure `.sc-track-card` from a 4-column layout to a 2-column layout (art + body). JS changes replace the track-number/eq-bar HTML and progress-bar HTML with 16 waveform bars that double as the progress indicator. Play button moves inside the card body.

**Tech Stack:** Vanilla CSS, Vanilla JS, SoundCloud Widget API, anime.js

**Spec:** `docs/superpowers/specs/2026-03-19-music-card-redesign-design.md`

---

### Task 1: Remove old CSS — track number, eq bars, progress bar

Remove CSS rules that are being replaced. This is a clean deletion task.

**Files:**
- Modify: `style.css:1267-1330` (track number + eq bar styles)
- Modify: `style.css:1462-1543` (progress-wrap, progress-scrub, progress-track, progress-fill styles)
- Modify: `style.css:1648-1675` (520px breakpoint — replaced later with 480px)

- [ ] **Step 1: Delete track number styles**

Delete lines 1267-1286 (`.sc-track-card__num`, hover/playing states for `__num`):

```css
/* DELETE: .sc-track-card__num through .sc-track-card--playing .sc-track-card__num */
```

- [ ] **Step 2: Delete eq bar styles and keyframes**

Delete lines 1288-1330 (`.sc-track-card__eq`, `__eq-bar`, `@keyframes eqBounce`, and the reduced-motion eq-bar block):

```css
/* DELETE: .sc-track-card__eq through @media (prefers-reduced-motion) eq-bar block */
```

- [ ] **Step 3: Delete progress bar styles (preserving scrub-hint)**

Delete in two ranges, keeping the scrub-hint styles intact:
- Delete lines 1462-1474 (`.sc-track-card__progress-wrap` and `__progress-scrub`)
- Keep lines 1475-1511 (`.sc-track-card__scrub-hint` and its states — reused for waveform)
- Delete lines 1512-1543 (`__progress-wrap:focus-visible`, `__progress-track`, hover state, reduced-motion, `__progress-fill`)

- [ ] **Step 3b: Delete orphaned `.sc-track-card__meta` styles**

Delete lines 1554-1561 (`.sc-track-card__meta` and `__meta--dynamic:empty`). The meta wrapper div is removed in the new card HTML; these styles become orphaned.

- [ ] **Step 4: Delete old 520px breakpoint**

Delete lines 1648-1675 (the `@media (max-width: 520px)` block that references the old 4-column grid):

```css
/* DELETE: @media (max-width: 520px) { .sc-track-card { grid-template-columns: 20px 56px 1fr 44px; ... } } */
```

- [ ] **Step 5: Verify CSS parses without errors**

Open the site in a browser (or use a CSS linter) to confirm no syntax errors from the deletions. Cards will look broken at this point — that's expected.

- [ ] **Step 6: Commit**

```bash
git add style.css
git commit -m "refactor: remove old track number, eq bar, and progress bar CSS"
```

---

### Task 2: Update card layout CSS — grid, art size, luminosity

Restructure the card grid and outer container, enlarge art, add luminosity effect.

**Files:**
- Modify: `style.css:1229-1233` (`.music-content`)
- Modify: `style.css:1236-1260` (`.sc-track-card`)
- Modify: `style.css:1396-1430` (`.sc-track-card__art`, `__img`)

- [ ] **Step 1: Convert `.music-content` to 2-col grid**

Change `.music-content` from:
```css
.music-content {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
```
To:
```css
.music-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}
```

- [ ] **Step 2: Restructure `.sc-track-card` grid**

Change `grid-template-columns` in `.sc-track-card` from:
```css
grid-template-columns: 28px 96px 1fr minmax(48px, auto);
```
To:
```css
grid-template-columns: 160px 1fr;
```

Also change `align-items: center` to `align-items: start` (line 1241). With 160px art and a multi-element body, centering would look wrong — art should align to the top of the card.

- [ ] **Step 3: Enlarge `.sc-track-card__art`**

Change `.sc-track-card__art` width/height from `96px` to `160px`:
```css
.sc-track-card__art {
    width: 160px;
    height: 160px;
    /* ... rest unchanged ... */
}
```

- [ ] **Step 4: Add luminosity effect to art images**

Add these styles after `.sc-track-card__img`:
```css
.sc-track-card__art img {
    filter: grayscale(1);
    mix-blend-mode: luminosity;
    transition: filter 0.3s ease, mix-blend-mode 0.3s ease;
}

.sc-track-card--playing .sc-track-card__art img {
    filter: none;
    mix-blend-mode: normal;
}
```

- [ ] **Step 5: Move `.sc-track-card__play` styles**

The play button is no longer a top-level grid column. Remove `align-self: center` from `.sc-track-card__play` (it will be inside `__body` now). Add a controls row style:
```css
.sc-track-card__controls {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
}
```

- [ ] **Step 6: Commit**

```bash
git add style.css
git commit -m "feat: restructure card layout to 2-col grid with larger art and luminosity"
```

---

### Task 3: Add waveform bar CSS

Add styles for the new waveform progress indicator.

**Files:**
- Modify: `style.css` (add after `.sc-track-card__artist` styles, around line 1460)

- [ ] **Step 1: Add waveform container and bar styles**

```css
.sc-track-card__waveform {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 40px;
    cursor: pointer;
    padding: 6px 0 4px;
    position: relative;
}

.sc-track-card__waveform:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}

.waveform-bar {
    flex: 1;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    transition: background 0.15s ease;
    min-height: 4px;
}

.waveform-bar--active {
    background: linear-gradient(0deg, color-mix(in srgb, var(--accent) 85%, #6644ff), var(--accent));
    box-shadow: 0 0 6px color-mix(in srgb, var(--accent) 30%, transparent);
}

@media (prefers-reduced-motion: reduce) {
    .waveform-bar {
        transition: none;
    }
}
```

- [ ] **Step 2: Adapt scrub-hint positioning for waveform**

The existing `.sc-track-card__scrub-hint` styles are kept. Update the parent reference: the hint will be positioned absolutely inside `.sc-track-card__waveform` (which has `position: relative`). No CSS change needed — the existing absolute positioning works since the waveform container has `position: relative`.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: add waveform bar CSS for progress indicator"
```

---

### Task 4: Add responsive breakpoints

Add the 768px and 480px breakpoints for the new layout.

**Files:**
- Modify: `style.css` (add breakpoints in the music section area)

- [ ] **Step 1: Add 768px breakpoint**

```css
@media (max-width: 768px) {
    .music-content {
        grid-template-columns: 1fr;
    }

    .sc-track-card {
        grid-template-columns: 96px 1fr;
    }

    .sc-track-card__art {
        width: 96px;
        height: 96px;
    }
}
```

- [ ] **Step 2: Add 480px breakpoint**

```css
@media (max-width: 480px) {
    .sc-track-card {
        grid-template-columns: 64px 1fr;
        gap: 10px;
        padding: 12px 12px;
    }

    .sc-track-card__art {
        width: 64px;
        height: 64px;
    }

    .sc-track-card__title {
        font-size: 0.9rem;
    }

    .sc-track-card__play {
        width: 40px;
        height: 40px;
        min-width: 40px;
        min-height: 40px;
    }

    .sc-track-card__waveform {
        height: 28px;
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: add responsive breakpoints for music card grid (768px, 480px)"
```

---

### Task 5: Update JS card builder — remove old HTML, add waveform

Replace the card HTML template in `buildScTrackCardMarkup()`.

**Files:**
- Modify: `scripts.js:1361-1390` (`buildScTrackCardMarkup` function)

- [ ] **Step 1: Replace `buildScTrackCardMarkup` function**

Replace the entire function body. The new version:
- Removes track-number div (`__num`, `__num-text`, `__eq`, `__eq-bar`)
- Removes old progress HTML (`__progress-wrap`, `__progress-scrub`, `__progress-track`, `__progress-fill`)
- Adds 16 waveform bars with randomized heights (20-90%) inside `.sc-track-card__waveform`
- Moves play button inside `__body` in a `.sc-track-card__controls` row alongside the SoundCloud link
- Waveform container gets ARIA slider attributes

```javascript
function buildScTrackCardMarkup(card, { title, artist, thumb, openUrl }) {
    const art = thumb
        ? `<img class="sc-track-card__img" src="${escapeHtml(thumb)}" alt="" width="160" height="160" loading="lazy" decoding="async">`
        : '<div class="sc-track-card__art-fallback" aria-hidden="true"></div>';
    const open = openUrl
        ? `<a class="sc-track-card__open" href="${escapeHtml(openUrl)}" target="_blank" rel="noopener noreferrer">Open in SoundCloud <i class="fas fa-external-link-alt" aria-hidden="true"></i></a>`
        : '';

    // Generate 16 waveform bars with random heights persisted for card lifetime
    let waveformBars = '';
    for (let i = 0; i < 16; i++) {
        const h = Math.floor(Math.random() * 71) + 20; // 20-90%
        waveformBars += '<div class="waveform-bar" style="height:' + h + '%"></div>';
    }

    card.innerHTML =
        '<div class="sc-track-card__art">' + art + '</div>' +
        '<div class="sc-track-card__body">' +
        '<h3 class="sc-track-card__title">' + escapeHtml(title) + '</h3>' +
        '<p class="sc-track-card__artist">' + escapeHtml(artist) + '</p>' +
        '<div class="sc-track-card__waveform" role="slider" tabindex="0" ' +
        'aria-label="Seek in track" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0:00">' +
        '<span class="sc-track-card__scrub-hint" aria-hidden="true"></span>' +
        waveformBars + '</div>' +
        '<div class="sc-track-card__times">' +
        '<span class="sc-track-card__elapsed">0:00</span>' +
        '<span class="sc-track-card__total">0:00</span></div>' +
        '<div class="sc-track-card__controls">' +
        '<button type="button" class="sc-track-card__play" aria-label="Play track"><i class="fas fa-play" aria-hidden="true"></i></button>' +
        (open ? open : '<span class="sc-track-card__meta sc-track-card__meta--dynamic"></span>') +
        '</div></div>';
}
```

- [ ] **Step 2: Remove `trackNum` from all call sites**

The `buildScTrackCardMarkup` no longer accepts `trackNum`. Update the two call sites (around lines 1790 and 1805):

From:
```javascript
buildScTrackCardMarkup(card, { title: title, artist: artist, thumb: thumb, openUrl: openUrl, trackNum: trackNum });
```
To:
```javascript
buildScTrackCardMarkup(card, { title: title, artist: artist, thumb: thumb, openUrl: openUrl });
```

Also remove the `const trackNum = idx + 1;` line (around line 1769).

- [ ] **Step 3: Update `applySoundMetadata` art size**

In `applySoundMetadata` (around line 1417), change the img width/height from `96` to `160`:

From:
```javascript
artWrap.innerHTML = '<img class="sc-track-card__img" src="' + escapeHtml(u) + '" alt="" width="96" height="96" loading="lazy" decoding="async">';
```
To:
```javascript
artWrap.innerHTML = '<img class="sc-track-card__img" src="' + escapeHtml(u) + '" alt="" width="160" height="160" loading="lazy" decoding="async">';
```

- [ ] **Step 4: Update `applySoundMetadata` meta link container**

The "Open in SoundCloud" link is now inside `.sc-track-card__controls`. Update the dynamic meta insertion (around line 1421):

From:
```javascript
const meta = card.querySelector('.sc-track-card__meta--dynamic');
if (meta) {
    meta.classList.remove('sc-track-card__meta--dynamic');
    meta.innerHTML = ...
```
To:
```javascript
const meta = card.querySelector('.sc-track-card__meta--dynamic');
if (meta) {
    meta.classList.remove('sc-track-card__meta--dynamic');
    meta.outerHTML =
        '<a class="sc-track-card__open" href="' + escapeHtml(sound.permalink_url) +
        '" target="_blank" rel="noopener noreferrer">Open in SoundCloud <i class="fas fa-external-link-alt" aria-hidden="true"></i></a>';
}
```

- [ ] **Step 5: Commit**

```bash
git add scripts.js
git commit -m "feat: update card builder with waveform bars, remove track numbers"
```

---

### Task 6: Update JS progress logic — waveform bar activation

Replace the fill-width progress with waveform bar active-state toggling.

**Files:**
- Modify: `scripts.js:1477-1542` (`resetProgressUi`, `applyProgressUi`)
- Modify: `scripts.js:1544-1585` (`PLAY_PROGRESS` handler)

- [ ] **Step 1: Update `resetProgressUi`**

Replace the function (around line 1477):

From:
```javascript
function resetProgressUi(card) {
    if (!card) return;
    const fill = card.querySelector('.sc-track-card__progress-fill');
    const elapsed = card.querySelector('.sc-track-card__elapsed');
    const total = card.querySelector('.sc-track-card__total');
    const wrap = card.querySelector('.sc-track-card__progress-wrap');
    if (fill) fill.style.width = '0%';
    if (elapsed) elapsed.textContent = '0:00';
    if (total) total.textContent = formatScTime(parseInt(card.dataset.scDuration, 10) || 0);
    if (wrap) {
        wrap.setAttribute('aria-valuenow', '0');
        wrap.setAttribute('aria-valuetext', '0:00');
    }
}
```
To:
```javascript
function resetProgressUi(card) {
    if (!card) return;
    const bars = card.querySelectorAll('.waveform-bar');
    bars.forEach(function (b) { b.classList.remove('waveform-bar--active'); });
    const elapsed = card.querySelector('.sc-track-card__elapsed');
    const total = card.querySelector('.sc-track-card__total');
    const waveform = card.querySelector('.sc-track-card__waveform');
    if (elapsed) elapsed.textContent = '0:00';
    if (total) total.textContent = formatScTime(parseInt(card.dataset.scDuration, 10) || 0);
    if (waveform) {
        waveform.setAttribute('aria-valuenow', '0');
        waveform.setAttribute('aria-valuetext', '0:00');
    }
}
```

- [ ] **Step 2: Update `applyProgressUi`**

Replace the function (around line 1527):

From:
```javascript
function applyProgressUi(card, currentMs, durationMs) {
    const d = durationMs || parseInt(card.dataset.scDuration, 10) || 0;
    if (d <= 0) return;
    const rel = Math.min(1, Math.max(0, currentMs / d));
    const fill = card.querySelector('.sc-track-card__progress-fill');
    const elapsed = card.querySelector('.sc-track-card__elapsed');
    const total = card.querySelector('.sc-track-card__total');
    const wrap = card.querySelector('.sc-track-card__progress-wrap');
    if (fill) fill.style.width = rel * 100 + '%';
    ...
```
To:
```javascript
function applyProgressUi(card, currentMs, durationMs) {
    const d = durationMs || parseInt(card.dataset.scDuration, 10) || 0;
    if (d <= 0) return;
    const rel = Math.min(1, Math.max(0, currentMs / d));
    const bars = card.querySelectorAll('.waveform-bar');
    const activeCount = Math.round(rel * bars.length);
    bars.forEach(function (b, i) {
        if (i < activeCount) {
            b.classList.add('waveform-bar--active');
        } else {
            b.classList.remove('waveform-bar--active');
        }
    });
    const elapsed = card.querySelector('.sc-track-card__elapsed');
    const total = card.querySelector('.sc-track-card__total');
    const waveform = card.querySelector('.sc-track-card__waveform');
    if (elapsed) elapsed.textContent = formatScTime(currentMs);
    if (total) total.textContent = formatScTime(d);
    if (waveform) {
        waveform.setAttribute('aria-valuenow', String(Math.round(rel * 100)));
        waveform.setAttribute('aria-valuetext', formatScTime(currentMs) + ' of ' + formatScTime(d));
    }
}
```

- [ ] **Step 3: Update `PLAY_PROGRESS` handler — remove fill reference**

In the `PLAY_PROGRESS` handler (around line 1564), replace:
```javascript
var fill = card.querySelector('.sc-track-card__progress-fill');
if (fill && typeof e.relativePosition === 'number') {
    fill.style.width = Math.min(100, Math.max(0, e.relativePosition * 100)) + '%';
}
```
With:
```javascript
if (typeof e.relativePosition === 'number') {
    var bars = card.querySelectorAll('.waveform-bar');
    var activeCount = Math.round(e.relativePosition * bars.length);
    bars.forEach(function (b, i) {
        if (i < activeCount) b.classList.add('waveform-bar--active');
        else b.classList.remove('waveform-bar--active');
    });
}
```

- [ ] **Step 4: Commit**

```bash
git add scripts.js
git commit -m "feat: update progress logic to activate waveform bars instead of fill div"
```

---

### Task 7: Update JS seek/scrub logic for waveform

Rewire click-to-seek, keyboard seek, and scrub hint to target the waveform container.

**Files:**
- Modify: `scripts.js:1618-1763` (`wireCard` function)

- [ ] **Step 1: Update `wireCard` — change querySelector targets**

In `wireCard`, update the variable bindings (around line 1620):

From:
```javascript
const playBtn = card.querySelector('.sc-track-card__play');
const progressWrap = card.querySelector('.sc-track-card__progress-wrap');
```
To:
```javascript
const playBtn = card.querySelector('.sc-track-card__play');
const waveformWrap = card.querySelector('.sc-track-card__waveform');
```

- [ ] **Step 2: Update `seekFromClientX` — use waveform as reference**

Replace the `seekFromClientX` function (around line 1712):

From:
```javascript
function seekFromClientX(clientX) {
    if (playingCard !== card) return;
    const track = card.querySelector('.sc-track-card__progress-track');
    if (!track) return;
    const rect = track.getBoundingClientRect();
    ...
```
To:
```javascript
function seekFromClientX(clientX) {
    if (playingCard !== card) return;
    const wf = card.querySelector('.sc-track-card__waveform');
    if (!wf) return;
    const rect = wf.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const dur = parseInt(card.dataset.scDuration, 10);
    if (dur <= 0) return;
    var targetMs = pct * dur;
    seekHoldMs = targetMs;
    seekHoldStarted = Date.now();
    applyProgressUi(card, targetMs, dur);
    widget.seekTo(targetMs);
}
```

- [ ] **Step 3: Update scrub hint to use waveform**

Replace the scrub hint setup (around line 1727):

From:
```javascript
var scrubZone = card.querySelector('.sc-track-card__progress-scrub');
var scrubHint = card.querySelector('.sc-track-card__scrub-hint');
var progressTrack = card.querySelector('.sc-track-card__progress-track');
if (scrubZone && scrubHint && progressTrack) {
    scrubZone.addEventListener('mousemove', function (ev) {
        var dur = getScTrackDurationMs(card);
        if (dur <= 0) return;
        var tr = progressTrack.getBoundingClientRect();
        var pct = Math.max(0, Math.min(1, (ev.clientX - tr.left) / tr.width));
        scrubHint.textContent = formatScTime(pct * dur);
        scrubHint.style.left = Math.max(6, Math.min(94, pct * 100)) + '%';
        scrubHint.classList.add('is-visible');
    });
    scrubZone.addEventListener('mouseleave', function () {
        scrubHint.classList.remove('is-visible');
    });
}
```
To:
```javascript
var scrubHint = card.querySelector('.sc-track-card__scrub-hint');
if (waveformWrap && scrubHint) {
    waveformWrap.addEventListener('mousemove', function (ev) {
        var dur = getScTrackDurationMs(card);
        if (dur <= 0) return;
        var rect = waveformWrap.getBoundingClientRect();
        var pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        scrubHint.textContent = formatScTime(pct * dur);
        scrubHint.style.left = Math.max(6, Math.min(94, pct * 100)) + '%';
        scrubHint.classList.add('is-visible');
    });
    waveformWrap.addEventListener('mouseleave', function () {
        scrubHint.classList.remove('is-visible');
    });
}
```

- [ ] **Step 4: Update click and keyboard listeners**

Replace `progressWrap` references with `waveformWrap` (around line 1745):

From:
```javascript
if (progressWrap) {
    progressWrap.addEventListener('click', function (ev) {
        seekFromClientX(ev.clientX);
    });
    progressWrap.addEventListener('keydown', function (ev) {
```
To:
```javascript
if (waveformWrap) {
    waveformWrap.addEventListener('click', function (ev) {
        seekFromClientX(ev.clientX);
    });
    waveformWrap.addEventListener('keydown', function (ev) {
```

The rest of the keydown handler stays the same.

- [ ] **Step 5: Commit**

```bash
git add scripts.js
git commit -m "feat: rewire seek/scrub logic to target waveform container"
```

---

### Task 8: Visual verification and polish

Test the complete implementation in browser across breakpoints.

**Files:**
- Possibly tweak: `style.css`, `scripts.js` (minor polish)

- [ ] **Step 1: Open site and navigate to Music tab**

Open `index.html` in browser, click Music tab. Verify:
- 7 cards load with metadata and artwork
- 2-column grid at desktop width
- Album art is 160px with luminosity/grayscale effect
- 16 waveform bars visible per card

- [ ] **Step 2: Test playback**

Click play on a track. Verify:
- Play/pause toggles correctly
- Only one track plays at a time
- Playing track art shows full color (luminosity removed)
- Waveform bars activate left-to-right as track plays
- Elapsed/total time updates

- [ ] **Step 3: Test seek**

Click on waveform bars to seek. Verify:
- Click position maps to correct seek position
- Scrub hint tooltip appears on hover
- Arrow keys seek ±5 seconds

- [ ] **Step 4: Test responsive**

Resize browser. Verify:
- <=768px: 1-column grid, 96px art
- <=480px: 64px art, reduced padding, smaller waveform

- [ ] **Step 5: Test edge cases**

- Loading shimmer before metadata loads
- Error state if SoundCloud fails
- `prefers-reduced-motion` disables transitions
- Hover glow on cards still works

- [ ] **Step 6: Final commit**

```bash
git add style.css scripts.js
git commit -m "feat: music card redesign — waveform progress, 2-col grid, luminosity art"
```
