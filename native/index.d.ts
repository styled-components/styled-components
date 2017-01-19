import * as ReactNative from "react-native";
import React from "react";

type ConstrainedProps<C, P> = C & ({ defaultProps?: P } | { new(props?: P, context?: any): any });
type StyledProps<P> = P & { theme: any };
type Interpolation<P> = ((executionContext: StyledProps<P>) => string) | string | number

interface StyledFunction<T, P> {
  (strs: TemplateStringsArray, ...fns: Array<Interpolation<P>>): T;
}

interface StyledInterface {
  <C extends React.ComponentClass<P>, P, ThemeInterface>(component: ConstrainedProps<C, StyledProps<P>>): StyledFunction<C, P>;
  <C extends React.StatelessComponent<P>, P, ThemeInterface>(component: ConstrainedProps<C, StyledProps<P>>): StyledFunction<C, P>;

  ActivityIndicator: StyledFunction<ReactNative.ActivityIndicator, ReactNative.ActivityIndicatorProperties>;
  ActivityIndicatorIOS: StyledFunction<ReactNative.ActivityIndicatorIOS, ReactNative.ActivityIndicatorProperties>;

  // ART: StyledFunction<ReactNative.ART>;
  Button: StyledFunction<ReactNative.Button, ReactNative.ButtonProperties>;
  DatePickerIOS: StyledFunction<ReactNative.DatePickerIOS, ReactNative.DatePickerIOSProperties>;
  DrawerLayoutAndroid: StyledFunction<ReactNative.DrawerLayoutAndroid, ReactNative.DrawerLayoutAndroidProperties>;
  Image: StyledFunction<ReactNative.Image, ReactNative.ImageProperties>;

  KeyboardAvoidingView: StyledFunction<ReactNative.KeyboardAvoidingView, ReactNative.KeyboardAvoidingViewProps>;
  ListView: StyledFunction<ReactNative.ListView, ReactNative.ListViewProperties>;
  MapView: StyledFunction<ReactNative.MapView, ReactNative.MapViewProperties>;
  Modal: StyledFunction<ReactNative.Modal, ReactNative.ModalProperties>;
  Navigator: StyledFunction<ReactNative.Navigator, ReactNative.NavigatorProperties>;
  NavigatorIOS: StyledFunction<ReactNative.NavigatorIOS, ReactNative.NavigatorIOSProperties>;
  Picker: StyledFunction<ReactNative.Picker, ReactNative.PickerProperties>;
  PickerIOS: StyledFunction<ReactNative.PickerIOS, ReactNative.PickerIOSProperties>;
  ProgressBarAndroid: StyledFunction<ReactNative.ProgressBarAndroid, ReactNative.ProgressBarAndroidProperties>;
  ProgressViewIOS: StyledFunction<ReactNative.ProgressViewIOS, ReactNative.ProgressViewIOSProperties>;
  ScrollView: StyledFunction<ReactNative.ScrollView, ReactNative.ScrollViewProps>;
  SegmentedControlIOS: StyledFunction<ReactNative.SegmentedControlIOS, ReactNative.SegmentedControlIOSProperties>;
  Slider: StyledFunction<ReactNative.Slider, ReactNative.SliderProperties>;
  SliderIOS: StyledFunction<ReactNative.SliderIOS, ReactNative.SliderPropertiesIOS>;
  SnapshotViewIOS: StyledFunction<ReactNative.SnapshotViewIOS, ReactNative.SnapshotViewIOSProperties>;
  RecyclerViewBackedScrollView: StyledFunction<ReactNative.RecyclerViewBackedScrollView, ReactNative.RecyclerViewBackedScrollViewProperties>;
  RefreshControl: StyledFunction<ReactNative.RefreshControl, ReactNative.RefreshControlProperties>;
  StatusBar: StyledFunction<ReactNative.StatusBar, ReactNative.StatusBarProperties>;
  SwipeableListView: StyledFunction<ReactNative.SwipeableListView, ReactNative.SwipeableListViewProps>;
  Switch: StyledFunction<ReactNative.Switch, ReactNative.SwitchProperties>;
  SwitchIOS: StyledFunction<ReactNative.SwitchIOS, ReactNative.SwitchIOSProperties>;
  Text: StyledFunction<ReactNative.Text, ReactNative.TextProperties>;
  TextInput: StyledFunction<ReactNative.TextInput, ReactNative.TextInputProperties>;
  TouchableHighlight: StyledFunction<ReactNative.TouchableHighlight, ReactNative.TouchableHighlightProperties>;
  TouchableNativeFeedback: StyledFunction<ReactNative.TouchableNativeFeedback, ReactNative.TouchableNativeFeedbackProperties>;
  TouchableOpacity: StyledFunction<ReactNative.TouchableOpacity, ReactNative.TouchableOpacityProperties>;
  TouchableWithoutFeedback: StyledFunction<ReactNative.TouchableWithoutFeedback, ReactNative.TouchableWithoutFeedbackProps>;
  View: StyledFunction<ReactNative.View, ReactNative.ViewProperties>;
  ViewPagerAndroid: StyledFunction<ReactNative.ViewPagerAndroid, ReactNative.ViewPagerAndroidProperties>;
  WebView: StyledFunction<ReactNative.WebView, ReactNative.WebViewProperties>;
}

declare const styled: StyledInterface;

export const css: StyledFunction<(string | Function)[], any>;

interface ThemeProps {
  theme: Object;
}

export const ThemeProvider: React.StatelessComponent<ThemeProps>;

export default styled;
