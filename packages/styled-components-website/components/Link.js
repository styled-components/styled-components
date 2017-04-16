import styled, { css } from 'styled-components'
import UnstyledLink from 'next/link'

export const StyledLink = styled.a`
  text-decoration: none;
  color: inherit;
  cursor: pointer;
`

export const InlineLink = styled(StyledLink).attrs({
  target: '_blank',
  rel: 'noopener'
})`
  text-decoration: underline;
  color: palevioletred;
  font-weight: 600;
`

const Link = ({ children, className, inline, ...rest }) => (
  <UnstyledLink {...rest}>
    {
      !inline ? (
        <StyledLink className={className}>
          {children}
        </StyledLink>
      ) : (
        <InlineLink className={className}>
          {children}
        </InlineLink>
      )
    }
  </UnstyledLink>
)

export default Link
