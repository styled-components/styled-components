import styled, { css } from 'styled-components'

import rem from '../../utils/rem'
import Link, { StyledLink } from '../Link'
import titleToDash from '../../utils/titleToDash'
import { lightGrey } from '../../utils/colors'
import { mobile } from '../../utils/media'

import { pages } from '../../pages/docs.json'

const MenuOuter = styled.aside`
  display: block;
  box-sizing: border-box;

  ${mobile(css`
    height: ${p => p.isFolded ? '0' : `calc(100vh - ${rem(70)})`};
    transition: height .2s ease-in-out;
    overflow: hidden;
  `)}
`

const MenuInner = styled.div`
  display: block;
  box-sizing: border-box;
  height: 100%;

  ${mobile(css`
    border-top: 2px solid ${lightGrey};
    padding-top: ${rem(10)};
    padding-bottom: ${rem(60)};
    overflow-y: scroll;
  `)}
`

const Section = styled.div`
  margin-bottom: ${rem(30)};
`

const SectionTitle = styled.h4`
  display: block;
  margin: ${rem(10)} ${rem(40)};
  font-weight: normal;
`

const SubSection = styled.h5`
  display: block;
  margin: ${rem(10)} ${rem(40)} ${rem(10)} ${rem(55)};
  font-size: 0.9rem;
  font-weight: normal;
`

const Menu = ({ isFolded, onRouteChange }) => (
  <MenuOuter isFolded={isFolded}>
    <MenuInner>
      {
        pages.map(({ title, pathname, sections }) => (
          <Section key={title} onClick={onRouteChange}>
            <SectionTitle>
              <Link href={`/docs/${pathname}`}>
                {title}
              </Link>
            </SectionTitle>

            {
              sections.map(({ title }) => (
                <SubSection key={title}>
                  <StyledLink href={`/docs/${pathname}#${titleToDash(title)}`}>
                    {title}
                  </StyledLink>
                </SubSection>
              ))
            }
          </Section>
        ))
      }
    </MenuInner>
  </MenuOuter>
)

export default Menu
