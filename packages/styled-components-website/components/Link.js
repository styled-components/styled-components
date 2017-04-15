import styled, { css } from 'styled-components'
import UnstyledLink from 'next/link'

export const StyledLink = styled.a`
  text-decoration: none;
  color: inherit;
  cursor: pointer;
`

const Link = ({ children, className, inline, ...rest }) => (
  <UnstyledLink {...rest}>
    <StyledLink className={className} inline={inline}>
      {children}
    </StyledLink>
  </UnstyledLink>
)

export const InlineLink = styled(StyledLink).attrs({
  target: '_blank',
  rel: 'noopener'
})`
  text-decoration: underline;
  color: palevioletred;
  font-weight: 600;
`

export default Link
