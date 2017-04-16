import styled, { css } from 'styled-components'
import rem from 'polished/lib/helpers/rem'
import { ChevronRightIcon } from 'react-octicons-svg'

import Link from './Link'
import { lightGrey } from '../utils/colors'
import { mobile } from '../utils/media'

const Wrapper = styled(Link)`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: flex-end;

  width: 100%;
  padding: ${rem(40)} ${rem(20)};
  text-align: right;

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
  height: 100%;
`

const NextPage = ({ title, href }) => (
  <Wrapper prefetch href={href}>
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
