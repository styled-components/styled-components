import styled, { css } from 'styled-components'
import ChevronRightIcon from 'react-octicons-svg/dist/ChevronRightIcon'

import rem from '../utils/rem'
import Link from './Link'
import { lightGrey } from '../utils/colors'
import { mobile } from '../utils/media'
import { headerFont } from '../utils/fonts'

const Wrapper = styled(Link)`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: flex-end;

  width: 100%;
  padding: ${rem(40)} ${rem(20)};
  text-align: right;
  font-family: ${headerFont};

  ${mobile(css`
    text-align: left;
    justify-content: center;
    padding: ${rem(30)} ${rem(20)};
  `)}
`

const Text = styled.h3`
  font-weight: normal;
  padding-right: ${rem(20)};
  margin: 0;
`

const PageName = styled.h2`
  font-weight: 600;
  padding-right: ${rem(20)};
  margin: 0;
`

const Icon = styled(ChevronRightIcon).attrs({
  width: null,
  height: null
})`
  color: ${lightGrey};
  width: ${rem(30)};
`

const NextPage = ({ title, href }) => (
  <Wrapper unstyled prefetch href={href}>
    <div>
      <Text>Continue on the next page</Text>
      <PageName>{title}</PageName>
    </div>

    <div>
      <Icon />
    </div>
  </Wrapper>
)

export default NextPage
