---
"styled-components": patch
---

Type-checking is faster when you annotate exported styled components with an explicit type, the pattern that packages emitting their own declaration files (including any project using `isolatedDeclarations`) rely on. The improvement is largest in codebases that annotate many components built on intrinsic tags such as `styled.div`, `styled.span`, and `styled.button`, and wrappers over polymorphic components whose props are a union.

Nothing about the styled component's type changes for your code: props, `defaultProps`, `propTypes`, ref forwarding, and `as` polymorphism all behave exactly as before. This is purely a type-check speedup.
