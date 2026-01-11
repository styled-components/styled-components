---
"styled-components": patch
---

Fixed `createGlobalStyle` to not use `useLayoutEffect` on the server, which was causing a warning and broken styles in v6.3.x. The check `typeof React.useLayoutEffect === 'function'` is not reliable for detecting server vs client environments in React 18+, so we now use the `__SERVER__` build constant instead.
