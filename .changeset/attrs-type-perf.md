---
"styled-components": patch
---

Fixed a TypeScript regression where `styled(SomeComponent).attrs({...})` could trigger `TS2590: Expression produces a union type that is too complex to represent` on components with deeply-discriminated prop unions (notably antd's `Button`).

The 6.4.0 change that made attrs-supplied props optional on the resulting component type composed two type operators (`FastOmit` + `Partial<Pick<…>>`) over the input prop type, which combined badly with the third-party component's own union internals. The composition is now a single mapped-type pass.

Net effect for projects with complex component prop types: ~6.5% fewer total type instantiations and ~3.7% lower TypeScript checker memory, with no behavior change. Components without complex unions see no measurable difference.
