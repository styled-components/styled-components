import reactNative from 'react-native'

import css from '../constructors/css'

import styledNativeComponent from '../models/StyledNativeComponent'
import type { Interpolation, Target } from '../types'

const styled = (tag: Target) =>
  (strings: Array<string>, ...interpolations: Array<Interpolation>) =>
    styledNativeComponent(tag, css(strings, ...interpolations), { inline: true })

const aliases = {
  get ActivityIndicator() { return styled(reactNative.ActivityIndicator) },
  get ActivityIndicatorIOS() { return styled(reactNative.ActivityIndicatorIOS) },
  get ART() { return styled(reactNative.ART) },
  get DatePickerIOS() { return styled(reactNative.DatePickerIOS) },
  get DrawerLayoutAndroid() { return styled(reactNative.DrawerLayoutAndroid) },
  get Image() { return styled(reactNative.Image) },
  get ImageEditor() { return styled(reactNative.ImageEditor) },
  get ImageStore() { return styled(reactNative.ImageStore) },
  get KeyboardAvoidingView() { return styled(reactNative.KeyboardAvoidingView) },
  get ListView() { return styled(reactNative.ListView) },
  get MapView() { return styled(reactNative.MapView) },
  get Modal() { return styled(reactNative.Modal) },
  get Navigator() { return styled(reactNative.Navigator) },
  get NavigatorIOS() { return styled(reactNative.NavigatorIOS) },
  get Picker() { return styled(reactNative.Picker) },
  get PickerIOS() { return styled(reactNative.PickerIOS) },
  get ProgressBarAndroid() { return styled(reactNative.ProgressBarAndroid) },
  get ProgressViewIOS() { return styled(reactNative.ProgressViewIOS) },
  get ScrollView() { return styled(reactNative.ScrollView) },
  get SegmentedControlIOS() { return styled(reactNative.SegmentedControlIOS) },
  get Slider() { return styled(reactNative.Slider) },
  get SliderIOS() { return styled(reactNative.SliderIOS) },
  get SnapshotViewIOS() { return styled(reactNative.SnapshotViewIOS) },
  get Switch() { return styled(reactNative.Switch) },
  get RecyclerViewBackedScrollView() { return styled(reactNative.RecyclerViewBackedScrollView) },
  get RefreshControl() { return styled(reactNative.RefreshControl) },
  get StatusBar() { return styled(reactNative.StatusBar) },
  get SwipeableListView() { return styled(reactNative.SwipeableListView) },
  get SwitchAndroid() { return styled(reactNative.SwitchAndroid) },
  get SwitchIOS() { return styled(reactNative.SwitchIOS) },
  get TabBarIOS() { return styled(reactNative.TabBarIOS) },
  get Text() { return styled(reactNative.Text) },
  get TextInput() { return styled(reactNative.TextInput) },
  get ToastAndroid() { return styled(reactNative.ToastAndroid) },
  get ToolbarAndroid() { return styled(reactNative.ToolbarAndroid) },
  get Touchable() { return styled(reactNative.Touchable) },
  get TouchableHighlight() { return styled(reactNative.TouchableHighlight) },
  get TouchableNativeFeedback() { return styled(reactNative.TouchableNativeFeedback) },
  get TouchableOpacity() { return styled(reactNative.TouchableOpacity) },
  get TouchableWithoutFeedback() { return styled(reactNative.TouchableWithoutFeedback) },
  get View() { return styled(reactNative.View) },
  get ViewPagerAndroid() { return styled(reactNative.ViewPagerAndroid) },
  get WebView() { return styled(reactNative.WebView) },
  get div() { return styled('div') },
}

export { css }

export default Object.create(styled, aliases)
