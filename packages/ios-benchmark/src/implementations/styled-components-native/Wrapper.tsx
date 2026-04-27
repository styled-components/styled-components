import styled from 'styled-components/native';

// `flex-direction: row` is explicit because RN's default is `column` (CSS
// default is `row`). Without it, `flex-wrap: wrap` wraps to columns instead
// of rows, leaving most of the bench area empty.
const Wrapper = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  align-content: flex-start;
  width: 100%;
  flex: 1;
`;

export default Wrapper;
