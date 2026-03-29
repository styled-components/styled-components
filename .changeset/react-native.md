---
'styled-components': patch
---

React Native improvements: replaced postcss with a lightweight CSS declaration parser, fixing `nanoid` crashes in Expo/Metro (#5705) and improving parse speed 4-6x. Parent re-renders with unchanged children are 2.6-3.2x faster via cache-first render. Updated native component alias list (removed 5 dead components, added 4 missing). Added `react-native` as an optional peer dependency.
