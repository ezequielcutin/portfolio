# Interface system — ezequielcutin.com (portfolio)

**Scope:** This site is a **personal portfolio** (single-page, narrative + tabs), not a SaaS app. The patterns below still govern **reusable UI surfaces**—tabs, cards, entries, controls, the boot screen—so new work stays visually aligned with the existing craft.

**Who / task / feel**

- **Who:** Recruiters, engineers, and collaborators skimming for credibility and voice—not dashboard operators.
- **Task:** Scan identity → pick a section (work / projects / music) → read or follow links. Low friction, high clarity.
- **Feel:** *Controlled terminal warmth*—precise and technical (mono, boot copy) without cold sterility; **one** electric accent carries energy; texture is **whisper** (film grain), not noise.

---

## Domain (territory)

1. **IDE-adjacent workspace** — monospace body, “loading modules” boot, cursor trail.
2. **Late-night studio** — audio visualizer, music tab; dark room, one colored light.
3. **Dossier / one file** — narrow column (`--max-width: 860px`), scannable sections.
4. **Link hub** — jobs and projects are exits to GitHub, SoundCloud, etc.; emphasis on readable outbound affordances.
5. **Easter-egg layer** — `secret-mode` recolors accent (blue ↔ pink) without changing structure.

**Signature (only here):** Boot terminal sequence + mono/Space Grotesk split + **single-hue** accent with optional secret palette swap. Removing the name, it still reads as “dev who makes sound in the dark.”

**Color world (in-world, not generic “dark theme”)**  
Dim booth / mastering room: **charcoal** walls (`#111`), **paper-gray** type (`#e0e0e0` / `#888`), **UI phosphor** blue (`#4488ff`) or **mag tape / cue** pink in secret mode—like one lit strip or VU, not a rainbow UI kit.

**Defaults this system rejects**


| Default                          | We use instead                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| Inter + gray-900 cards           | Space Grotesk (display) + system mono stack; near-single background                         |
| Multi-accent rainbow sections    | **One** accent; semantic meaning from structure, not extra hues                             |
| Heavy neumorphic / thick borders | `rgba(255,255,255,0.08)` borders + **subtle** inset highlight + soft lift shadow on entries |
| Full-bleed marketing hero        | Constrained **860px** column; hierarchy from type + tabs, not giant imagery                 |


---

## Token architecture (primitives)

Map new styles to these before adding ad-hoc hex.


| Role                           | Token / value                       | Notes                                              |
| ------------------------------ | ----------------------------------- | -------------------------------------------------- |
| Page background                | `--bg: #111111`                     | No alternate “card white”; stay on-canvas.         |
| Text primary                   | `--text-primary: #e0e0e0`           | Body default.                                      |
| Text secondary                 | `--text-secondary: #888888`         | Supporting, meta, de-emphasized.                   |
| Brand / action                 | `--accent`                          | Default `#4488ff`; `body.secret-mode` → `#ff4488`. |
| Brand wash                     | `--accent-subtle`                   | rgba of accent at ~8%—tabs hover, tints.           |
| Border default                 | `--border: rgba(255,255,255,0.08)`  | Standard separation.                               |
| Border active / focus-adjacent | `--border-active`                   | Accent-tinted rgba ~15%.                           |
| Heading font                   | `--font-heading: 'Space Grotesk'`   | Titles, card titles, `.about-lede` in intro.       |
| Code / UI font                 | `--font-mono` stack                 | Body, labels, tabs, boot, eyebrows.                |
| Radii                          | `--radius: 8px`, `--radius-sm: 6px` | Controls/cards: use these, not one-off 4/12/16.    |
| Content width                  | `--max-width: 860px`                | Main column.                                       |
| Elevation (entries)            | `--entry-shadow`                    | Inset top hairline + soft outer shadow.            |


**Optional future tokens (if hierarchy needs a fourth text step):** `--text-tertiary` (between secondary and disabled); keep same hue, shift lightness only.

---

## Depth strategy (commit)

**Borders + soft layered shadow + surface tint**—not glassmorphism, not heavy drop shadows.

- **Surfaces:** Slightly **lighter than bg** with `rgba(255,255,255,0.02)` (see `.now-item`) for “inset” fields of content.
- **Cards / entries:** `--entry-shadow` (and `--sc-card-shadow` where used)—whisper lift; no dramatic z-depth.
- **Focus:** `outline: 2px solid var(--accent)` with offset—don’t mix with thick box-shadows for the same state.

**Texture:** Global noise overlay on `body::after` at very low opacity—new layers should not fight it (no busy patterns on top).

---

## Typography scale (intent)


| Layer            | Use                                                                          | Rationale                         |
| ---------------- | ---------------------------------------------------------------------------- | --------------------------------- |
| **Display / H1** | Space Grotesk, clamp 32–44px, tight tracking                                 | Name presence.                    |
| **Eyebrow**      | Mono 10px, +letter-spacing, uppercase, accent color (`.panel-eyebrow`)       | Section labels, “system” voice.   |
| **Body**         | 15px mono default; long intro lede can use Space Grotesk 400 for readability | Dev voice vs. readable paragraph. |
| **Tab / label**  | Mono 12px, +letter-spacing                                                   | Navigation reads as “controls.”   |


**Data / code in content:** prefer `--font-mono` for alignment and technical feel.

---

## Spacing scale (base **8**)

Use multiples of **4** and **8** for consistency with existing work:

- **4** — micro (tight stack gaps, tag internals).
- **8** — default gap between related inline items (e.g. tab gap).
- **12–16** — internal padding of chips/small cards (`.now-item` uses 12×16).
- **24** — section padding / margin under tab bar.
- **28** — larger horizontal rhythm (e.g. hero cluster gap).
- **64 / 24** — page vertical / horizontal padding (`.container`).

Avoid orphan values like 13px or 19px except where already fixed (e.g. specific font sizes).

---

## Component patterns (reuse, don’t reinvent)

- **Primary navigation:** `.tabs` + `.tab` — outline style, 44px min-height, bottom gradient on active; keep hover = border + subtle radial + accent hairline.
- **Section label stack:** `.panel-eyebrow` + optional `.panel-sub` before content blocks.
- **Small link-out tiles:** `.now-item` pattern—border, hover lift `-2px`, border shifts to `--border-active`.
- **Boot / system messaging:** `.boot-screen` / `.boot-terminal` — only for all-page load state; don’t clone for every section.
- **Secret palette:** any new accent usage must work when `body.secret-mode` overrides `--accent`, `--accent-subtle`, `--border-active`.

---

## Motion

- **Fast** micro (0.15–0.2s) for hovers, opacity, color.
- **Easing:** ease or ease-out; avoid bouncy spring on structural UI.
- **Entrance:** existing anime/boot flows—new animations should feel equally restrained.

---

## Accessibility

- Skip link + `:focus-visible` with accent ring—new interactive controls get the same.
- Tab targets: maintain **≥44px** hit areas for primary nav.
- `aria-` patterns already on boot skip and tabs—extend, don’t strip.

---

## Consistency check (before merge)

- New colors map to existing tokens (or add token once, reuse).
- Spacing is on the 4/8 scale.
- Depth uses border + existing shadow system, not a new shadow language.
- **Swap test:** would changing Space Grotesk to Inter break the “studio” read? If yes, you’re on brand.
- **Signature test:** at least one element ties to terminal/studio/one-accent story.

---

*Last defined: 2026-04-23 — from live `style.css` + `index.html` structure.*