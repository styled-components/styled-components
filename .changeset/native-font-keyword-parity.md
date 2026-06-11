---
'styled-components': minor
---

CSS font-size keywords produce identical pixel sizes on iOS, Android, and the web. Absolute-size keywords (`xx-small`, `x-small`, `small`, `medium`, `large`, `x-large`, `xx-large`, `xxx-large`) resolve to 9, 10, 13, 16, 18, 24, 32, 48 (the reference table modern browsers use at the default medium of 16px). Relative-size keywords (`smaller`, `larger`) resolve at render time against the inherited cascade font-size, stepping to the next entry on the absolute-size ramp when the inherited size matches a keyword and otherwise multiplying by 1.2.

Other CSS Fonts shorthand keyword classes that React Native cannot replicate exactly drop with a development warning that names the offending keyword and suggests a concrete alternative:

- Font-width / font-stretch keywords (`condensed`, `expanded`, etc.) drop because React Native does not control glyph width.
- System font names (`caption`, `icon`, `menu`, `message-box`, `small-caption`, `status-bar`) drop because the per-platform meaning has no cross-platform mapping; pick a `font-family` explicitly.
