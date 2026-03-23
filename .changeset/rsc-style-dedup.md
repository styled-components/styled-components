---
'styled-components': patch
---

Deduplicate RSC inline `<style>` tags across component instances. Previously, every RSC styled component instance emitted its own `<style>` tag even when multiple instances produced identical CSS, causing significant HTML bloat. Now uses `React.cache` (React 19+) to track emitted CSS per server render, reducing duplicate tags to one per unique CSS string.
