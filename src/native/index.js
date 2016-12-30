// @flow

/* eslint-disable import/no-unresolved */
import reactNative from 'react-native'

import css from '../constructors/css'

import styledNativeComponent from '../models/StyledNativeComponent'
import ThemeProvider from '../models/ThemeProvider'
import withTheme from '../hoc/withTheme'
import type { Interpolation, Target } from '../types'

const styled = (tag: Target) =>
  (strings: Array<string>, ...interpolations: Array<Interpolation>) =>
    styledNativeComponent(tag, css(strings, ...interpolations))

/* React native lazy-requires each of these modules for some reason, so let's
*  assume it's for a good reason and not eagerly load them all */
const aliases = `ActivityIndicator ActivityIndicatorIOS ART Button DatePickerIOS DrawerLayoutAndroid
 Image ImageEditor ImageStore KeyboardAvoidingView ListView MapView Modal Navigator NavigatorIOS
 Picker PickerIOS ProgressBarAndroid ProgressViewIOS ScrollView SegmentedControlIOS Slider
 SliderIOS SnapshotViewIOS Switch RecyclerViewBackedScrollView RefreshControl StatusBar
 SwipeableListView SwitchAndroid SwitchIOS TabBarIOS Text TextInput ToastAndroid ToolbarAndroid
 Touchable TouchableHighlight TouchableNativeFeedback TouchableOpacity TouchableWithoutFeedback
 View ViewPagerAndroid WebView`

/* Define a getter for each alias which simply gets the reactNative component
 * and passes it to styled */
aliases.split(/\s+/m).forEach(alias => Object.defineProperty(styled, alias, {
  enumerable: true,
  configurable: false,
  get() {
    return styled(reactNative[alias])
  },
}))

export { css, ThemeProvider, withTheme }
export default styled
