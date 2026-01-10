---
'styled-components': patch
---

fix(types): add CSS custom properties (variables) support to style prop

CSS custom properties (CSS variables like `--primary-color`) are now fully supported in TypeScript without errors:

- `.attrs({ style: { '--var': 'value' } })` - CSS variables in attrs
- `<Component style={{ '--var': 'value' }} />` - CSS variables in component props
- Mixed usage with regular CSS properties works seamlessly
