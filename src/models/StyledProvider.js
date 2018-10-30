// @flow

import React, { Component, createContext } from 'react';

const StyledContext = createContext();

export const { Consumer: StyledConsumer } = StyledContext;

export default class StyledProvider extends Component<*> {
  static defaultProps = {
    scope: '',
  };

  render() {
    const { scope, ...restProps } = this.props;
    return <StyledContext.Provider value={{ scope }} {...restProps} />;
  }
}
