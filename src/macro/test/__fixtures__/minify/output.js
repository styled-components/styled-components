import styled from 'styled-components';
import React from 'react';


class Test extends React.Component {
  render() {
    return React.createElement('div', null, 'Hello World');
  }
}
const StyledTest = styled(Test).withConfig({
  displayName: 'code__StyledTest'
})(['\n  background: ', ';\n  color: red;\n'], props => props.theme.background);

export default StyledTest;