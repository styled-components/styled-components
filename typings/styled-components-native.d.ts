// <reference path="../react/react-native.d.ts" />

declare module "styled-components/native" {
    import * as ReactNative from "react-native";
    import { StatelessComponent } from "react";

    interface StyledFunction<T> {
      (values: TemplateStringsArray): T;
      (...values: any[]): T;
    }

    interface StyledInterface {
        <T extends ReactNative.ReactType>(component: T): StyledFunction<T>;

        ActivityIndicator: StyledFunction<ReactNative.ActivityIndicator>;
        ActivityIndicatorIOS: StyledFunction<ReactNative.ActivityIndicatorIOS>;
        // ART: StyledFunction<ReactNative.ART>;
        DatePickerIOS: StyledFunction<ReactNative.DatePickerIOS>;
        DrawerLayoutAndroid: StyledFunction<ReactNative.DrawerLayoutAndroid>;
        Image: StyledFunction<ReactNative.Image>;
        ImageEditor: StyledFunction<ReactNative.ImageEditor>;
        ImageStore: StyledFunction<ReactNative.ImageStore>;
        KeyboardAvoidingView: StyledFunction<ReactNative.KeyboardAvoidingView>;
        ListView: StyledFunction<ReactNative.ListView>;
        MapView: StyledFunction<ReactNative.MapView>;
        Modal: StyledFunction<ReactNative.Modal>;
        Navigator: StyledFunction<ReactNative.Navigator>;
        NavigatorIOS: StyledFunction<ReactNative.NavigatorIOS>;
        Picker: StyledFunction<ReactNative.Picker>;
        PickerIOS: StyledFunction<ReactNative.PickerIOS>;
        ProgressBarAndroid: StyledFunction<ReactNative.ProgressBarAndroid>;
        ProgressViewIOS: StyledFunction<ReactNative.ProgressViewIOS>;
        ScrollView: StyledFunction<ReactNative.ScrollView>;
        SegmentedControlIOS: StyledFunction<ReactNative.SegmentedControlIOS>;
        Slider: StyledFunction<ReactNative.Slider>;
        SliderIOS: StyledFunction<ReactNative.SliderIOS>;
        SnapshotViewIOS: StyledFunction<ReactNative.SnapshotViewIOS>;
        Switch: StyledFunction<ReactNative.Switch>;
        RecyclerViewBackedScrollView: StyledFunction<ReactNative.RecyclerViewBackedScrollView>;
        RefreshControl: StyledFunction<ReactNative.RefreshControl>;
        StatusBar: StyledFunction<ReactNative.StatusBar>;
        SwipeableListView: StyledFunction<ReactNative.SwipeableListView>;
        // SwitchAndroid: StyledFunction<ReactNative.SwitchAndroid>;
        SwitchIOS: StyledFunction<ReactNative.SwitchIOS>;
        Text: StyledFunction<ReactNative.Text>;
        TextInput: StyledFunction<ReactNative.TextInput>;
        Touchable: StyledFunction<ReactNative.Touchable>;
        TouchableHighlight: StyledFunction<ReactNative.TouchableHighlight>;
        TouchableNativeFeedback: StyledFunction<ReactNative.TouchableNativeFeedback>;
        TouchableOpacity: StyledFunction<ReactNative.TouchableOpacity>;
        TouchableWithoutFeedback: StyledFunction<ReactNative.TouchableWithoutFeedback>;
        View: StyledFunction<ReactNative.View>;
        ViewPagerAndroid: StyledFunction<ReactNative.ViewPagerAndroid>;
        WebView: StyledFunction<ReactNative.WebView>;
    }

    const styled: StyledInterface;

    export const css: StyledFunction<(string | Function)[]>;

    interface ThemeProps {
      theme: Object;
    }

    export const ThemeProvider: StatelessComponent<ThemeProps>;

    export default styled;
}
