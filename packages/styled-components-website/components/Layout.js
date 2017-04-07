import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'

export const Title = styled.h1`
  display: block;
  text-align: left;
  width: 100%;
  color: rgb(243, 182, 97);
  font-size: ${rem(42)};
  font-weight: bold;
`

export const Header = styled.h2`
  font-size: ${rem(32)};
  font-weight: normal;
`

export const SubHeader = styled.h3`
  display: block;
  margin: ${rem(8)} 0;
  font-size: ${rem(18)};
  font-weight: normal;
`
