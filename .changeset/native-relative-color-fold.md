---
'styled-components': minor
---

CSS Color 5 relative-color syntax now works on React Native. Write `oklch(from #f00 calc(l - 0.15) c h)` and the library resolves it against the base color's OKLCh coordinates, ships the result as a literal `#hex`, and the same paint shows up on iOS, Android, and the web. The four modern color forms accept the syntax: `oklch`, `oklab`, `lch`, `lab`.

The `from` argument can be a literal color (hex, named, or another modern color function) **or** a theme token (`oklch(from ${theme.colors.brand} calc(l - 0.15) c h)`). Channel keywords (`l`, `c`, `h`, `a`, `b`, `alpha`) substitute directly or inside `calc()`, so a single base color can drive a full set of derived shades without writing a value table.
