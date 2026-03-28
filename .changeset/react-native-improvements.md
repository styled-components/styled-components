---
'styled-components': patch
---

React Native improvements:

- Fixed crash with react-native-web (Expo/Metro) where `postcss`'s `nanoid` dependency failed to resolve at import time (#5705). Replaced postcss with a lightweight CSS declaration parser that is 4-6x faster and removes `postcss` (+ `nanoid`, `source-map-js`) as a production dependency.
- Parent re-renders with unchanged children are 2.6-3.2x faster via cache-first render pattern (skips style resolution entirely on cache hit).
- Updated the native component alias list: removed 5 components no longer in React Native (DatePickerIOS, DrawerLayoutAndroid, ProgressBarAndroid, ProgressViewIOS, Slider) and added 4 missing ones (InputAccessoryView, StatusBar, TouchableNativeFeedback, TouchableWithoutFeedback).
- `toStyleSheet()` now shares the style object cache with `InlineStyle`, avoiding redundant CSS parsing on repeated calls.
