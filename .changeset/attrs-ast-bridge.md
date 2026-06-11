---
'styled-components': minor
---

Added a second argument to function-form `attrs((props, ast) => ...)` callbacks for bridging styles into props on third-party components. The `ast` accessor exposes `peek` (read a value) and `pop` (read and remove from the rendered style), and accepts either a CSS property name or a typed dot-separated theme path (e.g. `'color.red.500'`). Path autocomplete and value-type inference flow from your augmented theme.

```tsx
import { Path } from 'react-native-svg';

const Icon = styled(Path).attrs((_props, ast) => ({
  fill: ast.pop('color'), // lift CSS decl into a prop
  stroke: ast.peek('palette.brand'), // read from theme via typed path
}))`
  color: red;
`;
```

Both methods take an optional fallback as the second argument, returned when the value is missing. Supported on the web and React Native, with no per-render overhead when the callback resolves entirely from static declarations.
