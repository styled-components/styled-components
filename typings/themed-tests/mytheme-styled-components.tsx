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
    ThemeProvider
} = styledComponents as ThemedStyledComponentsModule<MyTheme>;

export default styled;
export { css, injectGlobal, keyframes, ThemeProvider };
