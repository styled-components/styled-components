---
"styled-components": patch
---

Fixed a TypeScript regression where `styled(SomeComponent).attrs({...})` could trigger `TS2590: Expression produces a union type that is too complex to represent` on components with deeply-discriminated prop unions, notably antd's `Button`. Affected projects also see modestly faster type-checks; projects without complex unions see no measurable difference.
