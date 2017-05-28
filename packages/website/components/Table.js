import styled from 'styled-components'

import rem from '../utils/rem'
import { lightGrey } from '../utils/colors'
import { headerFont } from '../utils/fonts'

export const TableWrapper = styled.table`
  width: 100%;
  text-align: left;
  margin: ${rem(40)} 0;
`

const TableHead = styled.thead`
  border-bottom: 2px solid ${lightGrey};
  font-family: ${headerFont};
`

export const Row = styled.tr`
  padding: 0 ${rem(20)};
  padding-left: 0;

  &:not(:last-child) {
    border-bottom: 1px solid ${lightGrey};
  }
`

export const Column = styled.th`
  font-weight: normal;
  padding: ${rem(10)} ${rem(12)};
  padding-left: 0;
`

const TableHeadColumn = styled(Column)`
  text-transform: uppercase;
  font-size: 85%;
  opacity: 0.8;
`

const Table = ({ head, children }) => (
  <TableWrapper>
    <TableHead>
      <tr>
        {
          head.map((text, i) => (
            <TableHeadColumn key={i} title={text}>
              {text}
            </TableHeadColumn>
          ))
        }
      </tr>
    </TableHead>

    <tbody>
      {children}
    </tbody>
  </TableWrapper>
)

export default Table
