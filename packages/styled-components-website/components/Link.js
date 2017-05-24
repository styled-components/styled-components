import styled, { css } from 'styled-components'
import UnstyledLink from 'next/link'

import rem from '../utils/rem'
import { violetRed, lightGrey } from '../utils/colors'

export const StyledLink = styled.a`
  display: inline-block;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  padding: ${rem(2)} ${rem(8)};
  margin: ${rem(-2)} ${rem(-8)};

  @media (min-width: ${1000 / 16}em) {
    border-radius: ${rem(3)};

    &:hover {
      background: ${lightGrey};
    }
  }
`

export const InlineLink = styled.a.attrs({
  target: '_blank',
  rel: 'noopener'
})`
  color: ${p => p.white ? 'white' : violetRed};
  text-decoration: underline;
  font-weight: 600;
  cursor: pointer;
`

const Link = ({ children, className, inline, unstyled, white, ...rest }) => {
  let Child = StyledLink
  if (inline) {
    Child = InlineLink
  } else if (unstyled) {
    Child = 'a'
  }

  return (
    <UnstyledLink {...rest}>
      <Child href={rest.href} white={white} className={className}>
        {children}
      </Child>
    </UnstyledLink>
  )
}

export default Link
