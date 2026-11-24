---
'styled-components': major
---

Server component styles go through your style registry, the same one client components use, so the server-rendered page carries its styles in one place in tree order. Inline `<style>` tags in server component output have been removed in favor of the registry, and `stylisPluginRSC` has been removed in favor of this built-in ordering.

The registry is required for server component styles. A server styled component rendered without the registry above it, whether the app has no registry or the component sits outside it (a styled `<html>` or `<body>` around it, a sibling of it), gets no styles in the server-rendered HTML: its styles apply after hydration, and development warns once. Wrap `<html>` in the registry in your root layout, as the FAQ shows. `global-error.tsx` renders only in the browser, so its styles always apply after hydration.

Styles of a component first rendered inside a loading fallback, and global styles mounted by both a layout and its page, stay applied when React reveals content from behind a `<Suspense>` boundary or swaps one sibling route for another. `:first-child`, `:nth-child()` and sibling selectors match in server HTML, since no style tag sits between elements.

A `nonce` or `target` on a `<StyleSheetManager>` inside the registry does not apply during server rendering: its server styles join the registry's tag, which carries the registry's nonce. Both apply in the browser.

Supported hosts are Next.js with webpack or Turbopack, and Vite with `@vitejs/plugin-rsc` with the registry in the SSR entry. Listing `styled-components` in Next.js `serverExternalPackages` is not supported.

With partial prerendering, a component re-rendered in a dynamic hole repeats its rules after the prerendered shell's. With JavaScript off, a shell element whose inner component is repeated this way can lose a tie to it.
