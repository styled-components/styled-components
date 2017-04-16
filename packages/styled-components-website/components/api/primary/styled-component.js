import React from 'react'

import { SubHeader } from '../../Layout'
import Link from '../../Link'
import Code from '../../Code'
import Label from '../../Label'

const StyledComponent = () => (
  <div>
    <SubHeader>
      <Code>
        StyledComponent
      </Code>
    </SubHeader>

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
  </div>
)

export default StyledComponent
