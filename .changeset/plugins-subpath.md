---
'styled-components': major
---

Plugins moved to a dedicated `styled-components/plugins` subpath, and first-party plugins ship there.

```tsx
import { StyleSheetManager } from 'styled-components';
import { rtlPlugin, rscPlugin } from 'styled-components/plugins';

<StyleSheetManager plugins={[rtlPlugin]}>
  <App />
</StyleSheetManager>;
```

The `stylisPlugins` prop on `<StyleSheetManager>` is now `plugins`, the top-level `stylisPluginRSC` export has moved into the new subpath as `rscPlugin`, and the `enableVendorPrefixes` prop has been removed in favor of the opt-in `prefixPlugin`.

Migration:

```diff
-import { rtl, stylisPluginRSC } from 'styled-components';
+import { prefixPlugin, rtlPlugin, rscPlugin } from 'styled-components/plugins';

-<StyleSheetManager stylisPlugins={[rtl, stylisPluginRSC]} enableVendorPrefixes>
+<StyleSheetManager plugins={[prefixPlugin, rtlPlugin, rscPlugin]}>
```

`rtlPlugin` replaces `stylis-plugin-rtl` for users coming from v6: it swaps physical side properties (`padding-left` / `padding-right`), flips `left` / `right` keyword values on `float` / `clear` / `text-align` / `caption-side`, and mirrors 4-value shorthand positions. Logical properties like `margin-inline-start` pass through unchanged.

`prefixPlugin` adds vendor prefixes to the CSS you author. It is opt-in per subtree; a `<StyleSheetManager>` without it emits unprefixed CSS. The prefix set is scoped to the browsers that support the JavaScript APIs React requires (Chrome 45, Firefox 36, Safari 9 / iOS 9, Edge 12), and a construct is prefixed only where one of those browsers still needs it: `appearance`, `user-select`, `backdrop-filter`, `position: sticky`, `filter`, `clip-path`, the `mask*` family, `tab-size`, `writing-mode`, `hyphens`, `image-set()` in values, multi-column `column*`, `line-clamp`, `font-feature-settings`, `box-decoration-break`, `text-size-adjust`, `scroll-snap-type`, the inline logical `margin` and `padding` longhands, and the `::placeholder`, `:read-only`, and `:read-write` selectors. Prefixed declarations are emitted ahead of the standard one, so a browser that understands the standard form uses it.

Flexbox, transforms, transitions, animations, and gradients are left unprefixed, since those browsers need no prefix for them. Declarations you author already prefixed pass through untouched. For a different browser floor or prefix set, declare both forms yourself or write a plugin that emits the prefixes you need. Prefixing applies to web output; see https://styled-components.com/docs/compatibility for the React Native picture.

Custom plugins authored against the v6 stylis contract need to port to the narrower plugin interface, which exposes `rw` (selector rewrite) and `decl` (declaration rewrite) hooks; implement either or both. A hook may return one result or an array (one authored declaration or selector expands into several).

```ts
import type {
  DeclResult,
  DeclTransform,
  SCPlugin,
  SelectorTransform,
} from 'styled-components/plugins';

// `rw` is a `SelectorTransform`: runs on every fully-resolved selector after
// `&` substitution and namespace prepending. Return a new selector string, or
// an array of selectors to emit one rule per entry.
const scopePlugin: SCPlugin = {
  name: 'scope',
  rw: selector => `.app ${selector}`,
};

// `decl` is a `DeclTransform`: runs on every emitted `prop: value` pair
// (top-level decls, decl-body at-rules, keyframe frames). Return a `DeclResult`
// to rewrite, an array to expand one declaration into several, or `void` to
// leave the pair unchanged.
const remToPxPlugin: SCPlugin = {
  name: 'rem-to-px',
  decl: (prop, value) => {
    const match = value.match(/^(-?\d*\.?\d+)rem$/);
    return match ? { prop, value: `${parseFloat(match[1]) * 16}px` } : undefined;
  },
};
```

Custom plugins compose with the first-party ones left to right: pass `plugins={[prefixPlugin, myPlugin]}` and `myPlugin` runs on every declaration and selector `prefixPlugin` emitted.

The `name` field is required and identifies the plugin so different plugin sets across nested `<StyleSheetManager>` trees stay isolated. Each plugin is tree-shaken out of any bundle that doesn't import it.
