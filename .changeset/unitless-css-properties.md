---
'styled-components': patch
---

Numbers for `fontSizeAdjust`, `initialLetter`, `mathDepth`, and `shapeImageThreshold` in object styles render without a unit:

```ts
const Heading = styled.h1({
  fontSizeAdjust: 0.5,
  initialLetter: 3,
  mathDepth: 1,
  shapeImageThreshold: 0.7,
});
// font-size-adjust: 0.5; initial-letter: 3; math-depth: 1; shape-image-threshold: 0.7;
```
