import styled, { css } from 'styled-components'
import rem from '../utils/rem'
import { mobile } from '../utils/media'
import { bodyFont, headerFont } from '../utils/fonts'

export const Container = styled.div`
  padding-left: ${rem(300)};

  ${mobile(css`
    padding-left: 0;
    padding-top: ${rem(70)};
  `)}
`

export const Content = styled.div`
  width: ${rem(1024)};
  max-width: 100%;
  margin: 0 auto;
  padding: ${rem(50)} ${rem(40)} ${rem(30)} ${rem(40)};
  box-sizing: border-box;
  font-family: ${bodyFont};

  ${mobile(css`
    padding: ${rem(30)} ${rem(20)};
  `)}
`

export const Title = styled.h1`
  display: block;
  text-align: left;
  width: 100%;
  color: rgb(243, 182, 97);
  font-size: ${rem(42)};
  font-weight: bold;
  font-family: ${headerFont};
`

export const Header = styled.h2`
  font-size: ${rem(32)};
  font-weight: 500;
  font-family: ${headerFont};
`

export const SubHeader = styled.h3`
  display: block;
  margin: ${rem(35)} 0 ${rem(22)} 0;
  font-size: ${rem(24)};
  font-weight: 500;
  font-family: ${headerFont};
`
