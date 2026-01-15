---
"styled-components": patch
---

Optimize GroupedTag.indexOfGroup from O(n) to O(1) using lazy prefix sum caching. This improves performance for large applications with many styled components, particularly benefiting SSR scenarios where style extraction is frequent. Benchmarks show up to 300x faster lookups for apps with 1000+ components.
