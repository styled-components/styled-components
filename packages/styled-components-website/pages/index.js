import React, { Component } from 'react'
import styled, { css } from 'styled-components'
import { LiveProvider, LivePreview, LiveEditor } from 'react-live'
import fetch from 'isomorphic-fetch'
import StarIcon from 'react-octicons-svg/dist/StarIcon'

import rem from '../utils/rem'
import { headerFont } from '../utils/fonts'
import { violetRed, gold } from '../utils/colors'
import { editorMixin, StyledError } from '../components/LiveEdit'
import Code from '../components/Code'
import Link from '../components/Link'
import { Content } from '../components/Layout'
import HomepageGettingStarted from '../components/homepage-getting-started'
import captureScroll from '../components/CaptureScroll'

const headerCode = (`
const Logo = styled.img.attrs({
  alt: 'Styled Components Logo',
  src: '/static/logo.png'
})\`
  width: \${rem(125)};
  height: \${rem(125)};
\`

const Text = styled.h1\`
  font-size: \${rem(18)};
  font-weight: normal;
  margin: \${rem(36)} 0;
\`

const Tagline = styled.span\`
  display: block;
  font-weight: 600;
  font-size: \${rem(24)};
\`

const SubTagline = styled.span\`
  font-size: \${rem(20)};
\`

render(
  <div>
    <Logo />

    <Text>
      <Tagline>
        Visual primitives for the component age.
      </Tagline>

      <SubTagline>
        Use the best bits of ES6 and CSS to style your apps without stress 💅
      </SubTagline>
    </Text>
  </div>
)
`).trim()

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

const HeroContent = Content.extend`
  font-family: ${headerFont};
`

const EditorContainer = styled.div`
  display: inline-block;
  box-shadow: ${rem(1)} ${rem(1)} ${rem(20)} rgba(20, 20, 20, 0.27);
  margin: ${rem(35)} 0;
  text-align: left;
`

const Editor = captureScroll(styled(LiveEditor)`
  ${editorMixin}
`)

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

const Star = styled(StarIcon).attrs({
  width: null,
  height: null
})`
  position: relative;
  display: inline-block;
  width: ${rem(15)};
  color: ${violetRed};
  bottom: ${rem(2)};
`

class Index extends Component {
  static async getInitialProps() {
    const res = await fetch('https://api.github.com/repos/styled-components/styled-components')
    const json = await res.json()
    return { stars: json.stargazers_count }
  }

  render() {
    const { stars } = this.props

    return (
      <div>
        <Wrapper>
          <HeroContent>
            <LiveProvider
              code={headerCode}
              noInline
              mountStylesheet={false}
              scope={{ styled, css, rem }}>

              <LivePreview />

              <Links>
                <Button
                  href="https://github.com/styled-components/styled-components"
                  target="_blank"
                  rel="noopener"
                  primary
                >
                  {`GitHub ${stars} `}
                  <Star />
                </Button>

                <InternalButton href="/docs" prefetch>
                  Documentation
                </InternalButton>
              </Links>

              <EditorContainer>
                <Editor />
                <StyledError />
              </EditorContainer>
            </LiveProvider>
          </HeroContent>
        </Wrapper>

        <HomepageGettingStarted />
      </div>
    )
  }
}

export default Index
