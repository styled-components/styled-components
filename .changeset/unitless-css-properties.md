---
'styled-components': patch
---

Numbers for `fontSizeAdjust`, `hyphenateLimitChars`, `initialLetter`, `mathDepth`, `shapeImageThreshold`, `maskBorderOutset`, `maskBorderSlice`, and `maskBorderWidth` in object styles render without a unit:

```ts
const Heading = styled.h1({
  fontSizeAdjust: 0.5,
  hyphenateLimitChars: 6,
  initialLetter: 3,
  mathDepth: 1,
  shapeImageThreshold: 0.7,
});
// font-size-adjust: 0.5; hyphenate-limit-chars: 6; initial-letter: 3; math-depth: 1; shape-image-threshold: 0.7;
```

Components that set any of these properties to a number get a new class name on upgrade, since the emitted CSS changes.
