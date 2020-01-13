/* eslint-disable react/prop-types */
import React from 'react';
import { Client as Styletron } from 'styletron-engine-atomic';
import { Provider as StyletronProvider } from 'styletron-react';
import View from './View';

const styletron = new Styletron();

class Provider extends React.Component {
  render() {
    return (
      <StyletronProvider value={styletron}>
        <View>{this.props.children}</View>
      </StyletronProvider>
    );
  }
}

export default Provider;
