import * as ReactNative from "react-native";
import React from "react";

type ConstrainedProps<C, P> = C & ({ defaultProps?: P } | { new(props?: P, context?: any): any });
type StyledProps<P> = P & { theme: any };

interface StyledFunction<T, P> {
  (strs: TemplateStringsArray, ...fns: Array<(props: P) => string>): T;
}

interface StyledInterface {
  <C extends React.ComponentClass<P>, P, ThemeInterface>(component: ConstrainedProps<C, StyledProps<P>>): StyledFunction<C, P>;
  <C extends React.StatelessComponent<P>, P, ThemeInterface>(component: ConstrainedProps<C, P>): StyledFunction<C, P>;

  ActivityIndicator: StyledFunction<ReactNative.ActivityIndicator, StyledProps<ReactNative.ActivityIndicatorProperties>>;
  ActivityIndicatorIOS: StyledFunction<ReactNative.ActivityIndicatorIOS, StyledProps<ReactNative.ActivityIndicatorProperties>>;

  // ART: StyledFunction<ReactNative.ART>;
  Button: StyledFunction<ReactNative.Button, StyledProps<ReactNative.ButtonProperties>>;
  DatePickerIOS: StyledFunction<ReactNative.DatePickerIOS, StyledProps<ReactNative.DatePickerIOSProperties>>;
  DrawerLayoutAndroid: StyledFunction<ReactNative.DrawerLayoutAndroid, StyledProps<ReactNative.DrawerLayoutAndroidProperties>>;
  Image: StyledFunction<ReactNative.Image, StyledProps<ReactNative.ImageProperties>>;

  KeyboardAvoidingView: StyledFunction<ReactNative.KeyboardAvoidingView, StyledProps<ReactNative.KeyboardAvoidingViewProps>>;
  ListView: StyledFunction<ReactNative.ListView, StyledProps<ReactNative.ListViewProperties>>;
  MapView: StyledFunction<ReactNative.MapView, StyledProps<ReactNative.MapViewProperties>>;
  Modal: StyledFunction<ReactNative.Modal, StyledProps<ReactNative.ModalProperties>>;
  Navigator: StyledFunction<ReactNative.Navigator, StyledProps<ReactNative.NavigatorProperties>>;
  NavigatorIOS: StyledFunction<ReactNative.NavigatorIOS, StyledProps<ReactNative.NavigatorIOSProperties>>;
  Picker: StyledFunction<ReactNative.Picker, StyledProps<ReactNative.PickerProperties>>;
  PickerIOS: StyledFunction<ReactNative.PickerIOS, StyledProps<ReactNative.PickerIOSProperties>>;
  ProgressBarAndroid: StyledFunction<ReactNative.ProgressBarAndroid, StyledProps<ReactNative.ProgressBarAndroidProperties>>;
  ProgressViewIOS: StyledFunction<ReactNative.ProgressViewIOS, StyledProps<ReactNative.ProgressViewIOSProperties>>;
  ScrollView: StyledFunction<ReactNative.ScrollView, StyledProps<ReactNative.ScrollViewProps>>;
  SegmentedControlIOS: StyledFunction<ReactNative.SegmentedControlIOS, StyledProps<ReactNative.SegmentedControlIOSProperties>>;
  Slider: StyledFunction<ReactNative.Slider, StyledProps<ReactNative.SliderProperties>>;
  SliderIOS: StyledFunction<ReactNative.SliderIOS, StyledProps<ReactNative.SliderPropertiesIOS>>;
  SnapshotViewIOS: StyledFunction<ReactNative.SnapshotViewIOS, StyledProps<ReactNative.SnapshotViewIOSProperties>>;
  RecyclerViewBackedScrollView: StyledFunction<ReactNative.RecyclerViewBackedScrollView, StyledProps<ReactNative.RecyclerViewBackedScrollViewProperties>>;
  RefreshControl: StyledFunction<ReactNative.RefreshControl, StyledProps<ReactNative.RefreshControlProperties>>;
  StatusBar: StyledFunction<ReactNative.StatusBar, StyledProps<ReactNative.StatusBarProperties>>;
  SwipeableListView: StyledFunction<ReactNative.SwipeableListView, StyledProps<ReactNative.SwipeableListViewProps>>;
  Switch: StyledFunction<ReactNative.Switch, StyledProps<ReactNative.SwitchProperties>>;
  SwitchIOS: StyledFunction<ReactNative.SwitchIOS, StyledProps<ReactNative.SwitchIOSProperties>>;
  Text: StyledFunction<ReactNative.Text, StyledProps<ReactNative.TextProperties>>;
  TextInput: StyledFunction<ReactNative.TextInput, StyledProps<ReactNative.TextInputProperties>>;
  TouchableHighlight: StyledFunction<ReactNative.TouchableHighlight, StyledProps<ReactNative.TouchableHighlightProperties>>;
  TouchableNativeFeedback: StyledFunction<ReactNative.TouchableNativeFeedback, StyledProps<ReactNative.TouchableNativeFeedbackProperties>>;
  TouchableOpacity: StyledFunction<ReactNative.TouchableOpacity, StyledProps<ReactNative.TouchableOpacityProperties>>;
  TouchableWithoutFeedback: StyledFunction<ReactNative.TouchableWithoutFeedback, StyledProps<ReactNative.TouchableWithoutFeedbackProps>>;
  View: StyledFunction<ReactNative.View, StyledProps<ReactNative.ViewProperties>>;
  ViewPagerAndroid: StyledFunction<ReactNative.ViewPagerAndroid, StyledProps<ReactNative.ViewPagerAndroidProperties>>;
  WebView: StyledFunction<ReactNative.WebView, StyledProps<ReactNative.WebViewProperties>>;
}

declare const styled: StyledInterface;

export const css: StyledFunction<(string | Function)[], any>;

interface ThemeProps {
  theme: Object;
}

export const ThemeProvider: StatelessComponent<ThemeProps>;

export default styled;
