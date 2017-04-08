import React from 'react'
import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'

import DocsLayout from '../../components/DocsLayout'
import { Title, Header, SubHeader } from '../../components/Layout'
import Link from '../../components/Link'
import { pages } from '../docs.json'

const Row = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`

const Column = styled.div`
  width: 33%;
  max-width: 33%;
  flex-basis: 33%;
  padding-right: ${rem(15)};

  @media (max-width: 1000px) {
    width: 50%;
    max-width: 50%;
    flex-basis: 50%;
  }
`

const Documentation = ({ url }) => (
  <DocsLayout url={url}>
    <p>
      Utilising tagged template literals (a recent addition to JavaScript) and the power of CSS, styled-components allows you to write actual CSS code to style your components. It also removes the mapping between components and styles – using components as a low-level styling construct could not be easier!
    </p>

    <Row>
      {
        pages.map(({ title, pathname, sections }) => (
          <Column key={title}>
            <Header>{title}</Header>

            {
              sections.map(({ title, pathname: subPathname }) => (
                <SubHeader key={title}>
                  <Link href={`/docs/${pathname}/${subPathname}`}>
                    {title}
                  </Link>
                </SubHeader>
              ))
            }
          </Column>
        ))
      }
    </Row>
  </DocsLayout>
)

export default Documentation
