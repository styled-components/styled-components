---
'styled-components': minor
---

`prefixPlugin` from `styled-components/plugins` adds vendor prefixes to the CSS you author. It is opt-in per subtree; a `<StyleSheetManager>` without it emits unprefixed CSS.

```tsx
import { StyleSheetManager } from 'styled-components';
import { prefixPlugin } from 'styled-components/plugins';

<StyleSheetManager plugins={[prefixPlugin]}>
  <App />
</StyleSheetManager>;
```

The prefix set is scoped to the browsers that support the JavaScript APIs React requires (Chrome 45, Firefox 36, Safari 9 / iOS 9, Edge 12), and a construct is prefixed only where one of those browsers still needs it: `appearance`, `user-select`, `backdrop-filter`, `position: sticky`, `filter`, `clip-path`, the `mask*` family, `tab-size`, `writing-mode`, `hyphens`, `image-set()` in values, multi-column `column*`, `line-clamp`, `font-feature-settings`, `box-decoration-break`, `text-size-adjust`, `scroll-snap-type`, the inline logical `margin` and `padding` longhands, and the `::placeholder`, `:read-only`, and `:read-write` selectors. Prefixed declarations are emitted ahead of the standard one, so a browser that understands the standard form uses it.

Flexbox, transforms, transitions, animations, and gradients are left unprefixed, since those browsers need no prefix for them. Declarations you author already prefixed pass through untouched. For a different browser floor or prefix set, declare both forms yourself or write a plugin that emits the prefixes you need.

Prefixing applies to web output; see https://styled-components.com/docs/compatibility for the React Native picture. Importing one first-party plugin does not pull the others into your bundle.
