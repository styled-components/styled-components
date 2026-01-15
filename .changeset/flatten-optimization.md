---
"styled-components": patch
---

Optimize flatten function with imperative single-pass approach, reducing intermediate array allocations. Benchmarks show 1.5-2.4x performance improvements, with the biggest gains for nested style interpolations common in real-world usage.
