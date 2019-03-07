// @flow

/* eslint-disable import/no-unresolved */
import reactNative from 'react-native';

import { css, constructWithOptions } from '../constructors';
import {
  createInlineStyledNativeComponent,
  ThemeProvider,
  ThemeConsumer,
  ThemeContext,
} from '../models';
import { createInlineStyle } from '../models/InlineStyle';
import { withTheme } from '../hoc';
import { isStyledComponent } from '../utils';

import type { Target } from '../types';

const InlineStyle = createInlineStyle(reactNative.StyleSheet);
const styled = (tag: Target) =>
  constructWithOptions(createInlineStyledNativeComponent(InlineStyle), tag);

/* React native lazy-requires each of these modules for some reason, so let's
 *  assume it's for a good reason and not eagerly load them all */
const aliases = `ActivityIndicator ActivityIndicatorIOS ART Button DatePickerIOS DrawerLayoutAndroid
 Image ImageBackground ImageEditor ImageStore KeyboardAvoidingView ListView MapView Modal NavigatorIOS
 Picker PickerIOS ProgressBarAndroid ProgressViewIOS ScrollView SegmentedControlIOS Slider
 SliderIOS SnapshotViewIOS Switch RecyclerViewBackedScrollView RefreshControl SafeAreaView StatusBar
 SwipeableListView SwitchAndroid SwitchIOS TabBarIOS Text TextInput ToastAndroid ToolbarAndroid
 Touchable TouchableHighlight TouchableNativeFeedback TouchableOpacity TouchableWithoutFeedback
 View ViewPagerAndroid WebView FlatList SectionList VirtualizedList`;

/* Define a getter for each alias which simply gets the reactNative component
 * and passes it to styled */
aliases.split(/\s+/m).forEach(alias =>
  Object.defineProperty(styled, alias, {
    enumerable: true,
    configurable: false,
    get() {
      return styled(reactNative[alias]);
    },
  })
);

export { css, isStyledComponent, ThemeProvider, ThemeConsumer, ThemeContext, withTheme };
export default styled;
