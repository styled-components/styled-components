import styled, { css } from '../../src/index'

export const Content = styled.div`
  max-width: 100%;
  width: 400px;
  margin: 0 auto;
  box-sizing: border-box;
  transition: transform 150ms ease-out;

  ${p => p.hero && css`
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
`