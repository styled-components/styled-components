import React from 'react'
import styled, { css } from 'styled-components'

import rem from '../utils/rem'
import { headerFont } from '../utils/fonts'
import { violetRed, gold } from '../utils/colors'
import CodeBlock from '../components/CodeBlock'
import LiveEdit from '../components/LiveEdit'
import Code from '../components/Code'
import Link from '../components/Link'
import { Content } from '../components/Layout'
import HomepageGettingStarted from '../components/homepage-getting-started'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: white;

  background: linear-gradient(20deg, ${violetRed}, ${gold});
  box-shadow: 0px 2px 20px rgba(0, 0, 0, 0.17);
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
  font-family: ${headerFont};
  font-size: ${rem(24)};
`

const SubTagline = styled.span`
  font-family: ${headerFont};
  font-size: ${rem(20)};
`

const Links = styled.div`
  margin: ${rem(36)} 0;
`

const Button = styled.a`
  display: inline-block;
  border-radius: ${rem(3)};
  padding: ${rem(6)} 0;
  margin: ${rem(5)} ${rem(16)};
  text-decoration: none;
  text-align: center;
  width: ${rem(175)};
  font-family: ${headerFont};

  background: transparent;
  color: white;
  border: ${rem(2)} solid white;

  ${p => p.primary && css`
    background: white;
    color: palevioletred;
  `}
`

const InternalButton = Button.withComponent(Link);

const sample = (`
const Button = styled.button\`
  /* Adapt the colours based on primary prop */
  background: \${props => props.primary ? 'palevioletred' : 'white'};
  color: \${props => props.primary ? 'white' : 'palevioletred'};

  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid palevioletred;
  border-radius: 3px;
\`;

<Button>Normal</Button>
<Button primary>Primary</Button>
`).trim()

const Index = () => (
  <div>
    <Wrapper>
      <Content>
        <Logo />

        <Text>
          <Tagline>
            Visual primitives for the component age.
          </Tagline>

          <SubTagline>
            Use the best bits of ES6 and CSS to style your apps without stress 💅
          </SubTagline>
        </Text>

        <Links>
          <Button
            href="https://github.com/styled-components/styled-components"
            target="_blank"
            rel="noopener"
            primary
          >
            GitHub
          </Button>

          <InternalButton href="/docs" prefetch>
            Documentation
          </InternalButton>
        </Links>

        <CodeBlock language="jsx" code={sample} />
      </Content>
    </Wrapper>

    <HomepageGettingStarted />
  </div>
)

export default Index
