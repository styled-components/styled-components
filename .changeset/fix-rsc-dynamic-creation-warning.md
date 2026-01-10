---
'styled-components': patch
---

fix: suppress false "created dynamically" warnings in React Server Components

The dynamic creation warning check now properly detects RSC environments and skips validation when `IS_RSC` is true. This eliminates false warnings for module-level styled components in server components, which were incorrectly flagged due to RSC's different module evaluation context. Module-level styled components in RSC files no longer trigger warnings since they cannot be created inside render functions by definition.
