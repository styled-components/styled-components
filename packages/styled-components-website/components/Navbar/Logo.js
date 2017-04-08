import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'

const Logo = styled.img.attrs({
  alt: 'Styled Components',
  src: '/static/logo.png'
})`
  display: block;
  width: 100%;
  height: auto;
  padding: ${rem(65)} ${rem(85)} ${rem(45)};
  box-sizing: border-box;

  @media (max-width: 1000px) {
    width: auto;
    height: 100%;
    padding: ${rem(5)};
  }
`

export default Logo
