import * as styledComponents from "../..";
import { ThemedStyledComponentsModule } from "../..";

export interface MyTheme {
    primaryColor: string;
    backgroundColor: string;
    defaultMargin: number;
}

const {
    default: styled,
    css,
    injectGlobal,
    keyframes,
    withTheme,
    ThemeProvider,
} = styledComponents as ThemedStyledComponentsModule<MyTheme>;

interface ThemeProps {
  theme?: MyTheme;
}

export default styled;
export { css, injectGlobal, keyframes, withTheme, ThemeProvider, ThemeProps };
