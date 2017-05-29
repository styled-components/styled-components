import React, { Component } from 'react'
import styled, { css } from 'styled-components'
import { LiveProvider, LivePreview, LiveEditor } from 'react-live'
import fetch from 'isomorphic-fetch'
import StarIcon from 'react-octicons-svg/dist/StarIcon'
import HeartIcon from 'react-octicons-svg/dist/HeartIcon'

import rem from '../utils/rem'
import { headerFont } from '../utils/fonts'
import { violetRed, gold } from '../utils/colors'
import { editorMixin, StyledError } from '../components/LiveEdit'
import Code from '../components/Code'
import Link from '../components/Link'
import { Content } from '../components/Layout'
import HomepageGettingStarted from '../components/homepage-getting-started'
import captureScroll from '../components/CaptureScroll'

const Tagline = styled.h1`
  font-weight: 600;
  font-size: 1.3rem;
`

const SupportingTagline = styled.h2`
  font-size: 1.1rem;
  font-weight: 400;
`

const headerCode = (`
const Button = styled.a\`
  /* This renders the buttons above... Edit me! */
  display: inline-block;
  border-radius: 3px;
  padding: 0.5rem 0;
  margin: 0.5rem 1rem;
  width: 11rem;
  background: transparent;
  color: white;
  border: 2px solid white;

  /* The GitHub button is a primary button
   * edit this to target it specifically! */
  \${props => props.primary && css\`
    background: white;
    color: palevioletred;
  \`}
\`
`).trim()

import { LiveContextTypes } from 'react-live/lib/components/Live/LiveProvider'

const HomepageLivePreview = ({ className, ...rest }, { live: { element: Button }, live }) => {
  const InternalButton = Button.withComponent(Link);
  return (
    <div
      {...rest}
      className={`react-live-preview ${className}`}
    >
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
    </div>
  )
}

HomepageLivePreview.contextTypes = LiveContextTypes

const Title = styled.div`
  margin: 2rem 0;

  h1,
  h2 {
    margin: 0;
  }
`

const Logo = styled.img.attrs({
  alt: 'styled-components Logo',
  src: '/static/logo.png'
})`
  width: ${rem(125)};
  height: ${rem(125)};
`;

const UsersWrapper = styled.section`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  padding: 0.5rem;
  margin-bottom: 2rem;
`

const UsersHeading = styled.p`
  text-transform: uppercase;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  margin: 2.5rem 0 0.5rem;
  opacity: 0.8;
`

const CompanyLogo = styled.img`
  position: relative;
  height: ${p => p.height || '2rem'};
  margin: 0.5rem;
  bottom: ${p => p.bottom || 0};
  opacity: 0.8;
  filter: brightness(0) invert(1);
  transition: opacity 125ms ease-in-out;

  &:hover {
    opacity: 1;
  }
`

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
  width: 75rem;
`

const EditorContainer = styled.div`
  display: inline-block;
  box-shadow: ${rem(1)} ${rem(1)} ${rem(20)} rgba(20, 20, 20, 0.27);
  margin: ${rem(35)} 0;
  text-align: left;
  width: 100%;
  max-width: 34rem;
`

const Editor = captureScroll(styled(LiveEditor)`
  ${editorMixin}
  height: 24rem;
  white-space: pre;
  width: 100%;
`)

const Links = styled.div`
  margin: ${rem(36)} 0;
`

const Star = styled(StarIcon).attrs({
  width: null,
  height: null
})`
  position: relative;
  display: inline;
  width: ${rem(15)};
  color: ${violetRed};
  bottom: ${rem(2)};
`

const Footer = styled.footer`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: white;

  background: ${violetRed};
  box-shadow: 0px -2px 20px rgba(0, 0, 0, 0.17);
  box-sizing: border-box;
  margin-top: ${rem(50)};
`

const Heart = styled(HeartIcon).attrs({
  width: null,
  height: null
})`
  display: inline-block;
  width: ${rem(17)};
`

class Index extends Component {
  render() {
    return (
      <div>
        <Wrapper>
          <HeroContent>
            <LiveProvider
              code={headerCode}
              mountStylesheet={false}
              scope={{ styled, css, rem, Link }}>

              <Logo />

              <Title>
                <Tagline>Visual primitives for the component age.</Tagline>
                <SupportingTagline>
                  Use the best bits of ES6 and CSS to style your apps without stress 💅
                </SupportingTagline>
              </Title>

              <Links>
                <HomepageLivePreview />
              </Links>

              <EditorContainer>
                <Editor />
                <StyledError />
              </EditorContainer>
            </LiveProvider>

            <UsersHeading>Used by folks at</UsersHeading>

            <UsersWrapper>
              <CompanyLogo bottom="-0.2rem" height="1.75rem" src="/static/bloomberg-logo.svg" />
              <CompanyLogo height="1.75rem" src="/static/atlassian-logo.svg" />
              <CompanyLogo src="/static/reddit-logo.svg" />
              <CompanyLogo src="/static/target-logo.svg" />
              <CompanyLogo bottom="0.625rem" height="3rem" src="/static/eurovision-logo.svg" />
              <CompanyLogo bottom="0.16rem" height="2.25rem" src="/static/artsy-logo.svg" />
              <CompanyLogo bottom="-0.15rem" height="1.5rem" src="/static/ideo-logo.svg" />
            </UsersWrapper>
          </HeroContent>
        </Wrapper>

        <HomepageGettingStarted />

        <Footer>
          <HeroContent>
            {'Made with '}
            <Heart />
            {' by '}
            <Link inline white href="https://twitter.com/glenmaddern">@glenmaddern</Link>
            {', '}
            <Link inline white href="https://twitter.com/mxstbr">@mxstbr</Link>
            {' & '}
            <Link inline white href="https://twitter.com/_philpl">@_philpl‬</Link>
          </HeroContent>
        </Footer>
      </div>
    )
  }
}

export default Index
