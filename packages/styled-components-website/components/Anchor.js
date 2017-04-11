import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'

import { LinkIcon } from 'react-octicons-svg'
import { Header } from './Layout'

const Anchor = styled.a`
  display: none;
  position: absolute;
  left: 0;
  color: inherit;
`

const AnchorIcon = styled(LinkIcon).attrs({
  width: null,
  height: null
})`
  width: ${rem(20)};
  opacity: 0.7;
  margin-top: ${rem(-5)};
`

const AnchorHeader = styled(Header)`
  position: relative;
  margin-left: ${rem(-30)};
  padding-left: ${rem(30)};

  &:hover ${Anchor} {
    display: inline-block;
  }
`

export default ({ children, href }) => (
  <AnchorHeader>
    <Anchor href={href}>
      <AnchorIcon />
    </Anchor>

    {children}
  </AnchorHeader>
)
