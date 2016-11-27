// <reference path="../react/react-native.d.ts" />

declare module "styled-components/native" {
    import * as ReactNative from "react-native";
    import { StatelessComponent } from "react";

    interface StyledFunction<T, P> {
      (strs: TemplateStringsArray, ...fns: Array<(props: P) => string>): T;
    }

    interface StyledInterface {
        <T extends ReactNative.ReactType, P extends ReactNative.ReactPropTypes>(component: T): StyledFunction<T, P>;

        ActivityIndicator: StyledFunction<ReactNative.ActivityIndicator, ReactNative.ActivityIndicatorProperties>;
        ActivityIndicatorIOS: StyledFunction<ReactNative.ActivityIndicatorIOS, ReactNative.ActivityIndicatorProperties>;

        // ART: StyledFunction<ReactNative.ART>;
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
        Switch: StyledFunction<ReactNative.Switch, ReactNative.SwitchProperties>;
        RecyclerViewBackedScrollView: StyledFunction<ReactNative.RecyclerViewBackedScrollView, ReactNative.RecyclerViewBackedScrollViewProperties>;
        RefreshControl: StyledFunction<ReactNative.RefreshControl, ReactNative.RefreshControlProperties>;
        StatusBar: StyledFunction<ReactNative.StatusBar, ReactNative.StatusBarProperties>;
        SwipeableListView: StyledFunction<ReactNative.SwipeableListView, ReactNative.SwipeableListViewProps>;
        // SwitchAndroid: StyledFunction<ReactNative.SwitchAndroid>;
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

    const styled: StyledInterface;

    export const css: StyledFunction<(string | Function)[], any>;

    interface ThemeProps {
      theme: Object;
    }

    export const ThemeProvider: StatelessComponent<ThemeProps>;

    export default styled;
}
