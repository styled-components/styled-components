---
'styled-components': minor
---

React Native: styled scrollers (`styled.ScrollView`, `styled.FlatList`, and friends) nest like the web. A vertical scroller inside another vertical scrollable receives gestures on Android without passing `nestedScrollEnabled` yourself; iOS and the web behave this way too. Passing the prop explicitly still wins.

Declared scroller dimensions hold. React Native's ScrollView stretches and shrinks with its flex parent by default, so `height: 280px` on a styled scroller could render taller or shorter than written. A styled scroller defaults to `flex-shrink: 0`, matching `styled.View`, so an explicit `width` or `height` declaration pins reliably even in a flex parent, matching how CSS sizes a scroll container on the web. Scrollers without a declared dimension keep the fill-parent behavior, and declaring any flex property yourself (including `flex-shrink: 1`) takes precedence.
