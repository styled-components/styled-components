# Typescript Support

`styled-components` has typescript definitions to allow the library to be
used in any Typescript project.

To use the library you can import it as you normally do with any TS dependency.

```
import styled from 'styled-components'
```

## Example

A very basic example can be found [here](https://github.com/patrick91/Styled-Components-Typescript-Example).

## Define a Theme Interface

By default every styled component will have the theme prop set to `any`.
When building complex apps it would be better to have autocomplete and 
error checks everywhere.

To have autocomplete and checks around the theme prop we should first define
the theme interface we would like to use throught our app:

```ts
// theme.ts
export default interface ThemeInterface {
    primaryColor: string;
    primaryColorInverted: string;
}
```

then we can re-export the styled function with our custom theme interface:

```ts
// my-styled-components.ts
import * as styledComponents from "styled-components";
import { ThemedStyledComponentsModule } from "styled-components";

import ThemeInterface from "./theme";

const {
    default: styled,
    css,
    injectGlobal,
    keyframes,
    ThemeProvider
} = styledComponents as ThemedStyledComponentsModule<ThemeInterface>;

export default styled;
export { css, injectGlobal, keyframes, ThemeProvider };
```

Finally, instead of importing the styled functions from the `styled-components` module, 
we import it from our custom module.

```ts
import * as React from "react";

// same for css, etc
import styled from "themed-components";


const Link = styled.a`
    font-family: 'Cabin';
    font-weight: bold;
    font-size: 1.2rem;
    letter-spacing: 0.05em;
    color: {props => props.theme.primaryColor};
    display: block;
    cursor: pointer;

    transition: 0.3s background ease-out;

    &:hover {
        background: rgba(255, 255, 255, 0.2);
    }
`;


export default Link;
```

## Caveats

### Class Name

When defining a component you'd need to have `className` marked as optional
in the propTypes interface:

```ts
interface LogoProps {
    className?: string;
}


class Logo extends React.Component<LogoProps, {}> {
    render() {
        return <div className={this.props.className}>
            Logo
        </div>;
    }
}

const LogoStyled = styled(Logo)`
    font-family: 'Helvetica';
    font-weight: bold;
    font-size: 1.8rem;
`;
```

This is because typescript won't understand that `LogoStyled` has already a `className` set.

### Stateless Component


To use stateless components and have typechecking for the props you'd need to
define the component alongside with its type, like this:

```ts
interface BoxProps {
    theme?: ThemeInterface;
    borders?: boolean;
    className?: string;
}


const Box:React.StatelessComponent<BoxProps> = (props) =>
    <div className={props.className}>{props.children}</div>;


const StyledBox = styled(Box)`
    padding: ${props => props.theme.lateralPadding};
`;
```
