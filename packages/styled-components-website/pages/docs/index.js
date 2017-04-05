import React from 'react'
import styled from 'styled-components'
import rem from 'polished/lib/helpers/rem'

import Navbar from '../../components/Navbar'
import { Title, Header, SubHeader } from '../../components/Layout'
import { pages } from '../docs.json'

const Container = styled.div`
  padding-left: ${rem(300)};
  min-height: 100vh;
`

const Content = styled.div`
  width: ${rem(1024)};
  max-width: 100%;
  margin: 0 auto;
  min-height: 100vh;
  padding: ${rem(30)} ${rem(25)};
  box-sizing: border-box;
`

const Row = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`

const Column = styled.div`
  width: 33%;
  max-width: 33%;
  flex-basis: 33%;

  @media (max-width: 1000px) {
    width: 50%;
    max-width: 50%;
    flex-basis: 50%;
  }
`

const DocsExample = () => (
  <Container>
    <Navbar />

    <Content>
      <Title>Documentation</Title>
      <Row>
        {
          pages.map(({ title, sections }) => (
            <Column key={title}>
              <Header>{title}</Header>
              {
                sections.map(({ title }) => (
                  <SubHeader key={title}>{title}</SubHeader>
                ))
              }
            </Column>
          ))
        }
      </Row>
    </Content>
  </Container>
)

export default DocsExample
