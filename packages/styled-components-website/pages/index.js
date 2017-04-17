import styled, { css } from 'styled-components'
import rem from 'polished/lib/helpers/rem'
import { violetRed, gold } from '../utils/colors'
import { Content } from '../components/Layout'
import { BasicExample } from '../components/basics/getting-started'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: white;

  background: linear-gradient(20deg, ${violetRed}, ${gold});
  box-sizing: border-box;
  min-height: 100vh;
`

const Logo = styled.img.attrs({
  alt: 'Styled Components Logo',
  src: '/static/logo.png'
})`
  width: ${rem(125)};
  height: ${rem(125)};
`

const Text = styled.h1`
  font-size: ${rem(18)};
  font-weight: normal;
  margin: ${rem(36)} 0;
`

const Tagline = styled.span`
  display: block;
  font-weight: 600;
`

const Links = styled.div`
  margin: ${rem(36)} 0;
`

const Index = () => (
  <Wrapper>
    <Content>
      <Logo />

      <Text>
        <Tagline>
          Visual primitives for the component age.
        </Tagline>

        <span>
          Use the best bits of ES6 and CSS to style your apps without stress 💅
        </span>
      </Text>

      <BasicExample />

      <Links>
      </Links>
    </Content>
  </Wrapper>
)

export default Index
