import styled, { css } from '../../../src/index'
import { bodyFont, headerFont } from '../utils/fonts'

export const Content = styled.div`
  max-width: 100%;
  width: 400px;
  margin: 0 auto;
  box-sizing: border-box;
  font-family: ${bodyFont};
  transition: transform 150ms ease-out;

  ${p => p.hero && css`
    font-family: ${headerFont};
    width: 75rem;
  `}
`

export const Title = styled.h1`
  display: block;
  text-align: center;
  width: 100%;
  color: rgb(243, 182, 97);
  font-size: 24px;
  font-weight: bold;
  font-family: ${headerFont};
`