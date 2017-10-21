import styled from 'styled-components';
import React from 'react';


class Test extends React.Component {
  render() {
    return React.createElement('div', null, 'Hello World');
  }
}
const StyledTest = styled(Test).withConfig({
  displayName: 'code__StyledTest',
  componentId: 's1q2of5g-0'
})(['background:', ';color:red;'], props => props.theme.background);

export default StyledTest;