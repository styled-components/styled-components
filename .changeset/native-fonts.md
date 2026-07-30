---
'styled-components': minor
---

React Native: CSS font properties accept the full CSS grammar and produce identical results on iOS, Android, and the web.

- `font-size` accepts absolute-size keywords (`xx-small` through `xxx-large`), relative-size keywords (`larger` / `smaller`), absolute lengths (`pt`, `pc`, `in`, `cm`, `mm`, `Q`), font-relative units (`em`, `rem`, `lh`, `rlh` plus the font-metric forms `ex`, `cap`, `ch`, `ic` and their `r`-variants), viewport units, container-query units, and percentages. Absolute-size keywords resolve to 9, 10, 13, 16, 18, 24, 32, 48 (the reference ramp modern browsers use at the default medium of 16px) on every platform. Relative-size keywords resolve at render time against the inherited cascade font-size, stepping to the next entry on the ramp when the inherited size matches a keyword and otherwise multiplying by 1.2. Everything else folds against the current environment at render time.
- `line-height` accepts the same expanded set: absolute lengths, font-relative units (including font-metric forms), viewport units, container-query units, and percentages all resolve against the cascade. A percentage line height inside the `font` shorthand resolves when the font size is known.
- `letter-spacing` accepts the full CSS length grammar. Absolute lengths fold to dp at compile time; font-relative, viewport, and container-query units resolve at render time. Numbers, `px`, and `normal` are supported.
- `font-style: oblique` maps to `italic`; an authored angle triggers a development warning.
- Generic `font-family` keywords such as `serif`, `sans-serif`, `monospace`, `system-ui`, `ui-rounded`, `emoji`, and `math` map to an appropriate platform font on iOS and Android; react-native-web passes the keyword to the browser. When a font list contains multiple comma-separated families, styled-components uses the first one and shows a development warning because React Native accepts only one font family.

Font keyword classes that React Native cannot replicate exactly drop with a development warning that names the offending keyword and suggests a concrete alternative:

- Font-width / font-stretch keywords (`condensed`, `expanded`, etc.) drop because React Native does not control glyph width.
- System font names (`caption`, `icon`, `menu`, `message-box`, `small-caption`, `status-bar`) drop because the per-platform meaning has no cross-platform mapping; pick a `font-family` explicitly.

On the web, browser-handled values are kept as authored.
