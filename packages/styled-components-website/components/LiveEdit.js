import React from 'react'
import styled, { css } from 'styled-components'
import rem from 'polished/lib/helpers/rem'
import { lightGrey, red } from '../utils/colors'

import {
  LiveProvider,
  LiveEditor,
  LiveError,
  LivePreview
} from 'react-live'

const StyledProvider = styled(LiveProvider)`
  border-radius: ${rem(3)};
  box-shadow: 1px 1px 20px rgba(20, 20, 20, 0.27);
  overflow: hidden;
  margin: ${rem(35)} 0;
`

const Row = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: stretch;
  align-items: stretch;

  @media (max-width: 600px) {
    flex-direction: column;
  }
`

const columnMixin = css`
  flex-basis: 50%;
  width: 50%;
  max-width: 50%;

  @media (max-width: 600px) {
    flex-basis: auto;
    width: 100%;
    max-width: 100%;
  }
`

const StyledEditor = styled(LiveEditor)`
  background: ${lightGrey};
  font-size: 0.8rem;
  height: ${rem(400)};
  overflow: scroll;

  ${columnMixin}
`

const StyledPreview = styled(LivePreview)`
  position: relative;
  padding: 0.5rem;
  background: white;
  color: black;
  height: auto;
  overflow: hidden;

  ${columnMixin}
`

const StyledError = styled(LiveError)`
  display: block;
  width: 100%;
  padding: ${rem(8)};
  background: ${red};
  color: white;
  font-size: 0.8rem;
  white-space: pre;
`

const LiveEdit = ({ noInline, code }) => (
  <StyledProvider
    code={code}
    noInline={noInline}
    scope={{
      styled
    }}
  >
    <Row>
      <StyledEditor />
      <StyledPreview />
    </Row>

    <StyledError />
  </StyledProvider>
)

export default LiveEdit
