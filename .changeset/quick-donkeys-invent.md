---
'styled-components': patch
---

Fixed components built on targets whose props cannot be inspected, such as Mantine's polymorphic components, rejecting `children` and the target's own props once you added a prop of your own:

```tsx
const Styled = styled(MantineButton)<{ $variant: 'a' | 'b' }>``;

<Styled $variant="a" variant="filled">
  this now works
</Styled>;
```

Wrapping such a target without adding props already worked; adding one turned the permissiveness off. Your own declared props stay strictly typed either way.
