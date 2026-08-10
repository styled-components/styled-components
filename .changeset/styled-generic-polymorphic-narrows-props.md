---
'styled-components': patch
---

`styled()` wrapping a generic polymorphic component keeps its declared props narrow.

Wrapping a component whose props are generic over an element type, such as the common `<C extends React.ElementType>(props: PolymorphicProps<C, OwnProps>)` pattern, used to let the styled result accept prop values the component itself rejects: `styled(Button)` would take `variant="anything"` even though `<Button variant="anything">` is a type error. The wrapper now narrows those props exactly as the direct component does, so a bad value is caught in both places. Valid props, children, and plain (non-generic) targets are unaffected.
