import React from 'react'

import SectionLayout from '../../SectionLayout'
import Table, { Row, Column } from '../../Table'
import Link from '../../Link'
import Code from '../../Code'
import Label from '../../Label'

const StyledComponent = () => (
  <SectionLayout sub title={<Code>StyledComponent</Code>}>
    <p>
      <Label>web</Label> <Label>native</Label>
    </p>

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

    <SectionLayout sub title=".extendWith">
      <p>
        This is a method that creates a new <Code>StyledComponent</Code>, extends its rules,
        and changes the tag that is being used.<br />
        It works similarly <Code>.extend</Code>, but allows you to change the tag or component
        that the styled component renders.
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
        Returns a function that accepts a tagged template literal and returns a new <Code>StyledComponent</Code> with
        the new tag, and the new rules merged into the ones of the component this method was called on.
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
