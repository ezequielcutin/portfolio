# Work-experience logos

Drop an SVG here for each role and it renders automatically in the Work
timeline panels. Until a file exists, the panel shows a monogram placeholder
(the org's initials), so nothing looks broken.

Expected filenames (referenced from `data.js` → `work[].logo`):

| File | Organization |
|------|--------------|
| `uwm.svg` | United Wholesale Mortgage |
| `glenbrook.svg` | Glenbrook Trading |
| `zoox.svg` | Zoox |
| `michigan.svg` | University of Michigan |
| `msh.svg` | MSH |
| `eia.svg` | European Innovation Academy |
| `detroit.svg` | City of Detroit |

## Notes

- Logos render on a small light tile, so full-color brand marks stay legible on
  the dark theme. `object-fit: contain` keeps any aspect ratio.
- Square / badge marks read best. Wide wordmarks still work but render smaller.
- To theme a logo to the site's ink/terracotta instead of its true color,
  see `.pf-tl__logo*` in `style.css` (swap the `<img>` for a CSS `mask-image`
  driven by `currentColor`).
- Filenames are conventional (`logos/<id>.svg`); the explicit path lives on each
  `work[]` entry in `data.js` if you want to point elsewhere.
