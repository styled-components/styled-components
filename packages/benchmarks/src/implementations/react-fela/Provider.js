/* eslint-disable react/prop-types */
import React from 'react';
import { createRenderer } from 'fela';
import { Provider as FelaProvider } from 'react-fela';
import View from './View';

const renderer = createRenderer();

class Provider extends React.Component {
  render() {
    return (
      <FelaProvider renderer={renderer}>
        <View>{this.props.children}</View>
      </FelaProvider>
    );
  }
}

export default Provider;
