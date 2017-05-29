import React from 'react'
import SectionLayout from '../SectionLayout'
import { InlineLink } from '../Link'
import CodeBlock from '../CodeBlock'
import Code from '../Code'

const theme = (`
// theme.ts
export default interface ThemeInterface {
  primaryColor: string;
  primaryColorInverted: string;
}
`).trim()

const styledComponents = (`
// styled-components.ts
import * as styledComponents from 'styled-components';
import { ThemedStyledComponentsModule } from 'styled-components';

import ThemeInterface from './theme';

const {
    default: styled,
    css,
    injectGlobal,
    keyframes,
    ThemeProvider
} = styledComponents as ThemedStyledComponentsModule<ThemeInterface>;

export { css, injectGlobal, keyframes, ThemeProvider };
export default styled;
`).trim()

const propsClassName = (`
interface LogoProps {
  /* This prop is optional, since TypeScript won't know that it's passed by the wrapper */
  className?: string;
}

class Logo extends React.Component<LogoProps, {}> {
  render() {
    return (
      <div className={this.props.className}>
        Logo
      </div>
    );
  }
}

const LogoStyled = styled(Logo)\`
  font-family: 'Helvetica';
  font-weight: bold;
  font-size: 1.8rem;
\`;
`).trim()

const statelessComponent = (`
interface BoxProps {
  theme?: ThemeInterface;
  borders?: boolean;
  className?: string;
}

const Box: React.StatelessComponent<BoxProps> = props => (
  <div className={props.className}>
    {props.children}
  </div>
);

const StyledBox = styled(Box)\`
  padding: \${props => props.theme.lateralPadding};
\`;
`).trim()

const TypeScript = () => (
  <SectionLayout title="TypeScript">
    <p>
      styled-components has TypeScript definitions to allow the library to be used in any TypeScript project.
      <br />
      {'A basic example can be found '}
      <InlineLink href="https://github.com/patrick91/Styled-Components-Typescript-Example">
        here
      </InlineLink>
      .
    </p>

    <SectionLayout sub title="Define a theme interface">
      <p>
        By default every styled component will have the <Code>theme</Code> prop set to <Code>any</Code>.
        When building complex apps it would be better to have autocomplete and error checks everywhere.
      </p>

      <p>
        To have autocomplete and checks around the <Code>theme</Code> prop we should first define the theme
        interface we would like to use throughout our app:
      </p>

      <CodeBlock code={theme} language="jsx" />

      <p>
        Then we can re-export the <Code>styled</Code> function with our custom theme interface:
      </p>

      <CodeBlock code={styledComponents} language="jsx" />

      <p>
        Finally, instead of importing the styled functions from the styled-components module,
        we import it from our above, custom module.
      </p>
    </SectionLayout>

    <SectionLayout sub title={[ 'Caveat with ', <Code>className</Code> ]}>
      <p>
        When defining a component you will need to mark <Code>className</Code> as optional
        in your Props interface:
      </p>

      <CodeBlock code={propsClassName} language="jsx" />
    </SectionLayout>

    <SectionLayout sub title="Caveat with Stateless Components">
      <p>
        To use stateless components and have typechecking for the props you'll need to define
        the component alongside with its type, like this:
      </p>

      <CodeBlock code={statelessComponent} language="jsx" />
    </SectionLayout>
  </SectionLayout>
)

export default TypeScript
