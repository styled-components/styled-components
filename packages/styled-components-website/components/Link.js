import styled from 'styled-components'
import UnstyledLink from 'next/link'

export const StyledLink = styled.a`
  text-decoration: none;
  color: inherit;
  cursor: pointer;
`

const Link = ({ children, className, ...rest }) => (
  <UnstyledLink {...rest}>
    <StyledLink className={className}>
      {children}
    </StyledLink>
  </UnstyledLink>
)

export default Link
