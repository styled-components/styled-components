import React from 'react'
import { withTheme, ThemeProvider } from 'styled-components'

import SectionLayout from '../SectionLayout'
import LiveEdit from '../LiveEdit'
import CodeBlock from '../CodeBlock'
import Code from '../Code'

const sample = (`
// Define our button, but with the use of props.theme this time
const Button = styled.button\`
  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border-radius: 3px;

  /* Color the border and text with theme.main */
  color: \${props => props.theme.main};
  border: 2px solid \${props => props.theme.main};
\`;

// We're passing a default theme for Buttons that aren't wrapped in the ThemeProvider
Button.defaultProps = {
  theme: {
    main: 'palevioletred'
  }
}

// Define what props.theme will look like
const theme = {
  main: 'mediumseagreen'
};

render(
  <div>
    <Button>Normal</Button>

    <ThemeProvider theme={theme}>
      <Button>Themed</Button>
    </ThemeProvider>
  </div>
);
`).trim()

const functionSample = (`
// Define our button, but with the use of props.theme this time
const Button = styled.button\`
  color: \${props => props.theme.fg};
  border: 2px solid \${props => props.theme.fg};
  background: \${props => props.theme.bg};

  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border-radius: 3px;
\`;

// Define our \`fg\` and \`bg\` on the theme
const theme = {
  fg: 'palevioletred',
  bg: 'white'
};

// This theme swaps \`fg\` and \`bg\`
const invertTheme = ({ fg, bg }) => ({
  fg: bg,
  bg: fg
});

render(
  <ThemeProvider theme={theme}>
    <div>
      <Button>Default Theme</Button>

      <ThemeProvider theme={invertTheme}>
        <Button>Inverted Theme</Button>
      </ThemeProvider>
    </div>
  </ThemeProvider>
);
`).trim()

const withThemeSample = (`
import { withTheme } from 'styled-components'

class MyComponent extends React.Component {
  render() {
    console.log('Current theme: ', this.props.theme);
    // ...
  }
}

export default withTheme(MyComponent)
`).trim()

const scope = { withTheme, ThemeProvider }

const Theming = () => (
  <SectionLayout title="Theming">
    <p>
      styled-components has full theming support by exporting a <Code>&lt;ThemeProvider&gt;</Code> wrapper component.
      This component provides a theme to all React components underneath itself via the context API. In the render
      tree all styled-components will have access to the provided theme, even when they are multiple levels deep.
    </p>

    <p>
      To illustrate this, let's create our Button component, but this time we'll pass some variables down
      as a theme.
    </p>

    <LiveEdit
      code={sample}
      scope={scope}
      noInline
    />

    <SectionLayout sub title="Function themes">
      <p>
        You can also pass a function for the theme prop. This function will receive the parent theme, that is from
        another <Code>&lt;ThemeProvider&gt;</Code> higher up the tree. This way themes themselves can be made contextual.
      </p>

      <p>
        This example renders our above themed Button and a second one that uses a second ThemeProvider to invert the
        background and foreground colours. The function <Code>invertTheme</Code> receives the upper theme and creates a new one.
      </p>

      <LiveEdit
        code={functionSample}
        scope={scope}
        noInline
      />
    </SectionLayout>

    <SectionLayout sub title="Getting the theme without styled components">
      <p>
        If you ever need to use the current theme outside styled components (e.g. inside big components), you can use
        the <Code>withTheme</Code> higher order component.
      </p>

      <CodeBlock code={withThemeSample} language="jsx" />
    </SectionLayout>
  </SectionLayout>
)

export default Theming
