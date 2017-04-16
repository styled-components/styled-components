import React from 'react'

import { SubHeader } from '../../Layout'
import Table, { Row, Column } from '../../Table'
import Link from '../../Link'
import CodeBlock from '../../CodeBlock'
import Code from '../../Code'
import Label from '../../Label'

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

const WithTheme = () => (
  <div>
    <SubHeader>
      <Code>
        withTheme
      </Code>
    </SubHeader>

    <p>
      <Label>web</Label> <Label>native</Label>
    </p>

    <p>
      This is a higher order component factory to get the current theme from a <Code>ThemeProvider</Code> and
      pass it to your component as a <Code>theme</Code> prop.
    </p>

    <Table head={[ 'Arguments', 'Description' ]}>
      <Row>
        <Column>
          1. <Code>Component</Code>
        </Column>
        <Column>
          Any valid React component that can handle a <Code>theme</Code> prop.
        </Column>
      </Row>
    </Table>

    <p>
      Returns the passed component inside a wrapper (higher order component).
      The passed component will receive a <Code>theme</Code> prop with the current theme object.
    </p>

    <CodeBlock code={withThemeSample} />

    <p>
      Only use this if you need to get the theme as a prop.
      If you just need to set a valid stylesheet property, you can use normal theming for this.
      {' Check out the section on '}
      <Link
        inline
        href="/docs/advanced#theming"
      >
        Theming
      </Link>
      {' to read more on how to use this.'}
    </p>
  </div>
)

export default WithTheme
