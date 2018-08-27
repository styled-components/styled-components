import * as ReactNative from 'react-native'
import * as React from 'react'
import { StatelessComponent, ComponentClass } from 'react'

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
} from '..'

import { StyledFunction, BaseStyledInterface } from '..'

type Component<P> = ComponentClass<P> | StatelessComponent<P>

export type ReactNativeStyledFunction<P> = StyledFunction<P>

export interface StyledInterface extends BaseStyledInterface {
  ActivityIndicator: ReactNativeStyledFunction<
    ReactNative.ActivityIndicatorProperties
  >
  ActivityIndicatorIOS: ReactNativeStyledFunction<
    ReactNative.ActivityIndicatorProperties
  >

  // ART: StyledFunction<ReactNative.ART>;
  Button: ReactNativeStyledFunction<ReactNative.ButtonProperties>
  DatePickerIOS: ReactNativeStyledFunction<ReactNative.DatePickerIOSProperties>
  DrawerLayoutAndroid: ReactNativeStyledFunction<
    ReactNative.DrawerLayoutAndroidProperties
  >
  Image: ReactNativeStyledFunction<ReactNative.ImageProperties>
  ImageBackground: ReactNativeStyledFunction<
    ReactNative.ImageBackgroundProperties
  >

  KeyboardAvoidingView: ReactNativeStyledFunction<
    ReactNative.KeyboardAvoidingViewProps
  >
  ListView: ReactNativeStyledFunction<ReactNative.ListViewProperties>
  MapView: ReactNativeStyledFunction<ReactNative.MapViewProperties>
  Modal: ReactNativeStyledFunction<ReactNative.ModalProperties>
  NavigatorIOS: ReactNativeStyledFunction<ReactNative.NavigatorIOSProperties>
  Picker: ReactNativeStyledFunction<ReactNative.PickerProperties>
  PickerIOS: ReactNativeStyledFunction<ReactNative.PickerIOSProperties>
  ProgressBarAndroid: ReactNativeStyledFunction<
    ReactNative.ProgressBarAndroidProperties
  >
  ProgressViewIOS: ReactNativeStyledFunction<
    ReactNative.ProgressViewIOSProperties
  >
  ScrollView: ReactNativeStyledFunction<ReactNative.ScrollViewProps>
  SegmentedControlIOS: ReactNativeStyledFunction<
    ReactNative.SegmentedControlIOSProperties
  >
  Slider: ReactNativeStyledFunction<ReactNative.SliderProperties>
  SliderIOS: ReactNativeStyledFunction<ReactNative.SliderPropertiesIOS>
  SnapshotViewIOS: ReactNativeStyledFunction<
    ReactNative.SnapshotViewIOSProperties
  >
  RecyclerViewBackedScrollView: ReactNativeStyledFunction<
    ReactNative.RecyclerViewBackedScrollViewProperties
  >
  RefreshControl: ReactNativeStyledFunction<
    ReactNative.RefreshControlProperties
  >
  SafeAreaView: ReactNativeStyledFunction<ReactNative.SafeAreaView>
  StatusBar: ReactNativeStyledFunction<ReactNative.StatusBarProperties>
  SwipeableListView: ReactNativeStyledFunction<
    ReactNative.SwipeableListViewProps
  >
  Switch: ReactNativeStyledFunction<ReactNative.SwitchProperties>
  SwitchIOS: ReactNativeStyledFunction<ReactNative.SwitchIOSProperties>
  Text: ReactNativeStyledFunction<ReactNative.TextProperties>
  TextInput: ReactNativeStyledFunction<ReactNative.TextInputProperties>
  TouchableHighlight: ReactNativeStyledFunction<
    ReactNative.TouchableHighlightProperties
  >
  TouchableNativeFeedback: ReactNativeStyledFunction<
    ReactNative.TouchableNativeFeedbackProperties
  >
  TouchableOpacity: ReactNativeStyledFunction<
    ReactNative.TouchableOpacityProperties
  >
  TouchableWithoutFeedback: ReactNativeStyledFunction<
    ReactNative.TouchableWithoutFeedbackProps
  >
  View: ReactNativeStyledFunction<ReactNative.ViewProperties>
  ViewPagerAndroid: ReactNativeStyledFunction<
    ReactNative.ViewPagerAndroidProperties
  >
  WebView: ReactNativeStyledFunction<ReactNative.WebViewProperties>
}

declare const styled: StyledInterface

export default styled

// Themed version of StyledInterface

import {
  ThemedStyledFunction,
  ThemedBaseStyledInterface,
  ThemedCssFunction,
  ThemeProviderComponent,
  WithOptionalTheme,
} from '..'

export type ThemedReactNativeStyledFunction<P, T> = ThemedStyledFunction<P, T>
export interface ThemedStyledInterface<T> extends ThemedBaseStyledInterface<T> {
  ActivityIndicator: ThemedReactNativeStyledFunction<ReactNative.ActivityIndicatorProperties, T>
  ActivityIndicatorIOS: ThemedReactNativeStyledFunction<ReactNative.ActivityIndicatorProperties, T>
  Button: ThemedReactNativeStyledFunction<ReactNative.ButtonProperties, T>
  DatePickerIOS: ThemedReactNativeStyledFunction<ReactNative.DatePickerIOSProperties, T>
  DrawerLayoutAndroid: ThemedReactNativeStyledFunction<ReactNative.DrawerLayoutAndroidProperties, T>
  Image: ThemedReactNativeStyledFunction<ReactNative.ImageProperties, T>
  ImageBackground: ThemedReactNativeStyledFunction<ReactNative.ImageBackgroundProperties, T>
  KeyboardAvoidingView: ThemedReactNativeStyledFunction<ReactNative.KeyboardAvoidingViewProps, T>
  ListView: ThemedReactNativeStyledFunction<ReactNative.ListViewProperties, T>
  MapView: ThemedReactNativeStyledFunction<ReactNative.MapViewProperties, T>
  Modal: ThemedReactNativeStyledFunction<ReactNative.ModalProperties, T>
  NavigatorIOS: ThemedReactNativeStyledFunction<ReactNative.NavigatorIOSProperties, T>
  Picker: ThemedReactNativeStyledFunction<ReactNative.PickerProperties, T>
  PickerIOS: ThemedReactNativeStyledFunction<ReactNative.PickerIOSProperties, T>
  ProgressBarAndroid: ThemedReactNativeStyledFunction<ReactNative.ProgressBarAndroidProperties, T>
  ProgressViewIOS: ThemedReactNativeStyledFunction<ReactNative.ProgressViewIOSProperties, T>
  RecyclerViewBackedScrollView: ThemedReactNativeStyledFunction<ReactNative.RecyclerViewBackedScrollViewProperties, T>
  RefreshControl: ThemedReactNativeStyledFunction<ReactNative.RefreshControlProperties, T>
  SafeAreaView: ThemedReactNativeStyledFunction<ReactNative.SafeAreaView, T>
  ScrollView: ThemedReactNativeStyledFunction<ReactNative.ScrollViewProps, T>
  SegmentedControlIOS: ThemedReactNativeStyledFunction<ReactNative.SegmentedControlIOSProperties, T>
  Slider: ThemedReactNativeStyledFunction<ReactNative.SliderProperties, T>
  SliderIOS: ThemedReactNativeStyledFunction<ReactNative.SliderPropertiesIOS, T>
  SnapshotViewIOS: ThemedReactNativeStyledFunction<ReactNative.SnapshotViewIOSProperties, T>
  StatusBar: ThemedReactNativeStyledFunction<ReactNative.StatusBarProperties, T>
  SwipeableListView: ThemedReactNativeStyledFunction<ReactNative.SwipeableListViewProps, T>
  Switch: ThemedReactNativeStyledFunction<ReactNative.SwitchProperties, T>
  SwitchIOS: ThemedReactNativeStyledFunction<ReactNative.SwitchIOSProperties, T>
  Text: ThemedReactNativeStyledFunction<ReactNative.TextProperties, T>
  TextInput: ThemedReactNativeStyledFunction<ReactNative.TextInputProperties, T>
  TouchableHighlight: ThemedReactNativeStyledFunction<ReactNative.TouchableHighlightProperties, T>
  TouchableNativeFeedback: ThemedReactNativeStyledFunction<ReactNative.TouchableNativeFeedbackProperties, T>
  TouchableOpacity: ThemedReactNativeStyledFunction<ReactNative.TouchableOpacityProperties, T>
  TouchableWithoutFeedback: ThemedReactNativeStyledFunction<ReactNative.TouchableWithoutFeedbackProps, T>
  View: ThemedReactNativeStyledFunction<ReactNative.ViewProperties, T>
  ViewPagerAndroid: ThemedReactNativeStyledFunction<ReactNative.ViewPagerAndroidProperties, T>
  WebView: ThemedReactNativeStyledFunction<ReactNative.WebViewProperties, T>
}

// Useful for https://www.styled-components.com/docs/api#define-a-theme-interface
export interface ThemedStyledComponentsModule<T> {
  default: ThemedStyledInterface<T>

  css: ThemedCssFunction<T>

  withTheme<P extends { theme?: T }>(
    component: React.ComponentType<P>
  ): ComponentClass<WithOptionalTheme<P, T>>

  ThemeProvider: ThemeProviderComponent<T>
}
