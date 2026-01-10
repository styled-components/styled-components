---
'styled-components': minor
---

feat: update built-in element aliases to include modern HTML and SVG elements

Added support for modern HTML and SVG elements that were previously missing:

HTML elements:
- `search` - HTML5 search element
- `slot` - Web Components slot element
- `template` - HTML template element

SVG filter elements:
- All `fe*` filter primitive elements (feBlend, feColorMatrix, feComponentTransfer, etc.)
- `clipPath`, `linearGradient`, `radialGradient` - gradient and clipping elements
- `textPath` - SVG text path element
- `switch`, `symbol`, `use` - SVG structural elements

This ensures styled-components has comprehensive coverage of all styleable HTML and SVG elements supported by modern browsers and React.

