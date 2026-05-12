---
'styled-components': patch
---

`aspect-ratio` on React Native now accepts the spec's full grammar: a bare ratio (`16 / 9`), the keyword `auto`, or the two-value form `auto <ratio>` / `<ratio> auto`. The two-value form emits the ratio and logs a one-time dev warning that the `auto` half only honors intrinsic dimensions on replaced elements (styled `<Image>` and similar); for other styled views, drop the `auto` keyword to suppress the warning.
