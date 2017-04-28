import * as ReactNative from "react-native";
import * as React from "react";
import { StatelessComponent, ComponentClass } from "react";

export {
  ThemeProps,
  ThemeProvider,
  Interpolation,
  InterpolationValue,
  InterpolationFunction,
  OuterStyledProps,
  StyledFunction,
  BaseStyledInterface,
  css,
  withTheme,
} from "..";

import { StyledFunction, BaseStyledInterface } from "..";

type Component<P> = ComponentClass<P> | StatelessComponent<P>;

export type ReactNativeStyledFunction<P> = StyledFunction<P>;

export interface StyledInterface extends BaseStyledInterface {
  ActivityIndicator: ReactNativeStyledFunction<ReactNative.ActivityIndicatorProperties>;
  ActivityIndicatorIOS: ReactNativeStyledFunction<ReactNative.ActivityIndicatorProperties>;

  // ART: StyledFunction<ReactNative.ART>;
  Button: ReactNativeStyledFunction<ReactNative.ButtonProperties>;
  DatePickerIOS: ReactNativeStyledFunction<ReactNative.DatePickerIOSProperties>;
  DrawerLayoutAndroid: ReactNativeStyledFunction<ReactNative.DrawerLayoutAndroidProperties>;
  Image: ReactNativeStyledFunction<ReactNative.ImageProperties>;

  KeyboardAvoidingView: ReactNativeStyledFunction<ReactNative.KeyboardAvoidingViewProps>;
  ListView: ReactNativeStyledFunction<ReactNative.ListViewProperties>;
  MapView: ReactNativeStyledFunction<ReactNative.MapViewProperties>;
  Modal: ReactNativeStyledFunction<ReactNative.ModalProperties>;
  Navigator: ReactNativeStyledFunction<ReactNative.NavigatorProperties>;
  NavigatorIOS: ReactNativeStyledFunction<ReactNative.NavigatorIOSProperties>;
  Picker: ReactNativeStyledFunction<ReactNative.PickerProperties>;
  PickerIOS: ReactNativeStyledFunction<ReactNative.PickerIOSProperties>;
  ProgressBarAndroid: ReactNativeStyledFunction<ReactNative.ProgressBarAndroidProperties>;
  ProgressViewIOS: ReactNativeStyledFunction<ReactNative.ProgressViewIOSProperties>;
  ScrollView: ReactNativeStyledFunction<ReactNative.ScrollViewProps>;
  SegmentedControlIOS: ReactNativeStyledFunction<ReactNative.SegmentedControlIOSProperties>;
  Slider: ReactNativeStyledFunction<ReactNative.SliderProperties>;
  SliderIOS: ReactNativeStyledFunction<ReactNative.SliderPropertiesIOS>;
  SnapshotViewIOS: ReactNativeStyledFunction<ReactNative.SnapshotViewIOSProperties>;
  RecyclerViewBackedScrollView: ReactNativeStyledFunction<ReactNative.RecyclerViewBackedScrollViewProperties>;
  RefreshControl: ReactNativeStyledFunction<ReactNative.RefreshControlProperties>;
  StatusBar: ReactNativeStyledFunction<ReactNative.StatusBarProperties>;
  SwipeableListView: ReactNativeStyledFunction<ReactNative.SwipeableListViewProps>;
  Switch: ReactNativeStyledFunction<ReactNative.SwitchProperties>;
  SwitchIOS: ReactNativeStyledFunction<ReactNative.SwitchIOSProperties>;
  Text: ReactNativeStyledFunction<ReactNative.TextProperties>;
  TextInput: ReactNativeStyledFunction<ReactNative.TextInputProperties>;
  TouchableHighlight: ReactNativeStyledFunction<ReactNative.TouchableHighlightProperties>;
  TouchableNativeFeedback: ReactNativeStyledFunction<ReactNative.TouchableNativeFeedbackProperties>;
  TouchableOpacity: ReactNativeStyledFunction<ReactNative.TouchableOpacityProperties>;
  TouchableWithoutFeedback: ReactNativeStyledFunction<ReactNative.TouchableWithoutFeedbackProps>;
  View: ReactNativeStyledFunction<ReactNative.ViewProperties>;
  ViewPagerAndroid: ReactNativeStyledFunction<ReactNative.ViewPagerAndroidProperties>;
  WebView: ReactNativeStyledFunction<ReactNative.WebViewProperties>;
}

declare const styled: StyledInterface;

export default styled;
