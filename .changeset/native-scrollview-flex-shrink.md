---
'styled-components': minor
---

React Native: `styled.ScrollView` defaults to `flex-shrink: 0`, matching `styled.View`. An explicit `width:` or `height:` declaration pins reliably even when the component sits in a flex parent. Declare `flex-shrink: 1` in your own template to let the layout engine resize it instead.
