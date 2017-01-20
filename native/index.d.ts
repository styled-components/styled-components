import * as ReactNative from "react-native";
import * as React from "react";
import { StatelessComponent, ComponentClass } from "react";

export interface ThemeProps {
  theme: any;
}

type Component<P> = ComponentClass<P> | StatelessComponent<P>;
type StyledProps<P> = P & ThemeProps;
export interface InterpolationFunction<P> {
  (props: StyledProps<P>): InterpolationValue<P> | ReadonlyArray<Interpolation<P>>;
}
type InterpolationValue<P> = string | number;
export type Interpolation<P> = InterpolationFunction<P> | InterpolationValue<P> | ReadonlyArray<InterpolationValue<P> | InterpolationFunction<P>>;

export type OuterStyledProps<P> = P & {
  theme?: Object;
  innerRef?: (instance: any) => void;
};

export interface StyledFunction<P> {
  (strings: TemplateStringsArray, ...interpolations: Interpolation<StyledProps<P>>[]): ComponentClass<OuterStyledProps<P>>;
  <U>(strings: TemplateStringsArray, ...interpolations: Interpolation<StyledProps<P & U>>[]): ComponentClass<OuterStyledProps<P & U>>;
}

export type ReactNativeStyledFunction<P> = StyledFunction<P>;

export interface StyledInterface {
  <P>(component: Component<P>): StyledFunction<P>;

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

export function css<P>(strings: TemplateStringsArray, ...interpolations: Interpolation<StyledProps<P>>[]): Interpolation<StyledProps<P>>[];

export const ThemeProvider: React.ComponentClass<ThemeProps>;

export default styled;
