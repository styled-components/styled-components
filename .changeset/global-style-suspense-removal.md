---
'styled-components': patch
---

Fixed global styles from `createGlobalStyle` disappearing in React Server Components: a global style rendered in a loading state (a React `<Suspense>` fallback) and again once the real content streamed in could vanish entirely once the fallback was replaced. The same loss could happen across a client-side navigation when a global style was rendered by both a layout and one of its pages, and the layout's copy never re-rendered.

Each server-rendered instance of a global style now carries its own styles, so a global style shown in more than one place in a request always survives, whether the page reveals streamed content or the user navigates to a sibling route.
