import React from 'react'

import SectionLayout from '../../SectionLayout'
import Table, { Row, Column } from '../../Table'
import Link from '../../Link'
import Code from '../../Code'

const StyledComponent = () => (
  <SectionLayout sub title={<Code>StyledComponent</Code>} labels={[ 'web', 'native' ]}>
    <p>
      A styled React component. This is returned when you
      call <Code>styled.tagname</Code> or <Code>styled(Component)</Code> with styles.
    </p>

    <p>
      This component can take any prop. It passes it on to the HTML node if it's a valid attribute,
      otherwise it only passes it into interpolated functions. (see <Code>TaggedTemplateLiteral</Code>)
    </p>

    <p>
      You can pass an arbitrary classname to a styled component without problem and it will be applied
      next to the styles defined by the styled call.
      (e.g. <Code>&lt;MyStyledComp className="bootstrap__btn" /&gt;</Code>)
    </p>

    <SectionLayout sub title=".extend">
      <p>
        This is a method that creates a new <Code>StyledComponent</Code> and extends its rules.
      </p>

      <Table head={[ 'Arguments', 'Description' ]}>
        <Row>
          <Column>
            1. <Code>TaggedTemplateLiteral</Code>
          </Column>
          <Column>
            A tagged template literal with your CSS and interpolations.
          </Column>
        </Row>
      </Table>

      <p>
        Returns a new <Code>StyledComponent</Code> with the new rules merged into the ones of the component
        this method was called on.
      </p>

      <p>
        {'You can see it in action in the '}
        <Link
          inline
          href="/docs/basics#extending-styles"
        >
          Extending Styles
        </Link>
        {' section.'}
      </p>
    </SectionLayout>

    <SectionLayout sub title=".withComponent">
      <p>
        This is a method that creates a new <Code>StyledComponent</Code> with a different tag or component
        applied to it, but all the same rules of the one it's called on.
      </p>

      <Table head={[ 'Arguments', 'Description' ]}>
        <Row>
          <Column>
            1. <Code>component</Code> / <Code>tagname</Code>
          </Column>
          <Column>
            Either a valid react component or a tagname like <Code>'div'</Code>.
          </Column>
        </Row>
      </Table>

      <p>
        Returns a new <Code>StyledComponent</Code> with the new tag / component being applied when it's used.
      </p>

      <p>
        {'You can see it in action in the '}
        <Link
          inline
          href="/docs/basics#extending-styles"
        >
          Extending Styles
        </Link>
        {' section.'}
      </p>
    </SectionLayout>
  </SectionLayout>
)

export default StyledComponent
