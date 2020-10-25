import constructWithOptions from '../constructors/constructWithOptions';
import css from '../constructors/css';
import withTheme from '../hoc/withTheme';
import useTheme from '../hooks/useTheme';
import _InlineStyle from '../models/InlineStyle';
import _StyledNativeComponent from '../models/StyledNativeComponent';
import ThemeProvider, { ThemeConsumer, ThemeContext } from '../models/ThemeProvider';
import { WebTarget } from '../types';
import isStyledComponent from '../utils/isStyledComponent';

const reactNative = require('react-native');

const InlineStyle = _InlineStyle(reactNative.StyleSheet);
const StyledNativeComponent = _StyledNativeComponent(InlineStyle);
const styled = (tag: WebTarget) => constructWithOptions(StyledNativeComponent, tag);

/* React native lazy-requires each of these modules for some reason, so let's
 *  assume it's for a good reason and not eagerly load them all */
const aliases = `ActivityIndicator ActivityIndicatorIOS ART Button DatePickerIOS DrawerLayoutAndroid
 Image ImageBackground ImageEditor ImageStore KeyboardAvoidingView ListView MapView Modal NavigatorIOS
 Picker PickerIOS ProgressBarAndroid ProgressViewIOS ScrollView SegmentedControlIOS Slider
 SliderIOS SnapshotViewIOS Switch RecyclerViewBackedScrollView RefreshControl SafeAreaView StatusBar
 SwipeableListView SwitchAndroid SwitchIOS TabBarIOS Text TextInput ToastAndroid ToolbarAndroid
 Touchable TouchableHighlight TouchableNativeFeedback TouchableOpacity TouchableWithoutFeedback
 View ViewPagerAndroid WebView FlatList SectionList VirtualizedList Pressable`;

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

export { css, isStyledComponent, ThemeProvider, ThemeConsumer, ThemeContext, withTheme, useTheme };
export default styled;
