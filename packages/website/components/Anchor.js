import styled, { css } from 'styled-components'
import rem from '../utils/rem'

import LinkIcon from 'react-octicons-svg/dist/LinkIcon'
import { Header, SubHeader } from './Layout'
import { mobile } from '../utils/media'

const InvisibleAnchor = styled.div.attrs({
  'aria-hidden': true
})`
  position: relative;
  display: block;
  visibility: hidden;
  height: 0;

  top: ${rem(-20)};

  ${mobile(css`
    top: ${rem(-90)};
  `)}
`

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

  &:hover {
    opacity: 0.9;
  }
`

const AnchorHeader = styled(Header)`
  position: relative;
  margin-left: ${rem(-30)};
  padding-left: ${rem(30)};

  ${mobile(css`
    margin-left: 0;

    ${Anchor} {
      display: inline-block;
    }
  `)}

  &:hover ${Anchor} {
    display: inline-block;
  }
`

const AnchorSubHeader = AnchorHeader.withComponent(SubHeader)

export default ({ children, id, sub }) => {
  const Child = sub ? AnchorSubHeader : AnchorHeader

  return (
    <Child>
      <InvisibleAnchor id={id} />

      <Anchor href={`#${id}`}>
        <AnchorIcon />
      </Anchor>

      {children}
    </Child>
  )
}
