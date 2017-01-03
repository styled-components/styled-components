# Typescript Support

`styled-components` has typescript definitions to allow the library to be
used in any Typescript project.

To use the library you can import it as you normally do with any TS dependency.

```
import styled from 'styled-components'
```

## Example

A very basic example can be found [here](https://github.com/patrick91/Styled-Components-Typescript-Example).

## Caveats

### Class Name

When defining a component you'd need to have `className` marked as optional
in the propTypes interface:

```
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

```
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
