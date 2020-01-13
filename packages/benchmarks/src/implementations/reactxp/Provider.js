/* eslint-disable react/prop-types */
import React from 'react';
import { object } from 'prop-types';
import { View } from 'reactxp';

class Provider extends React.Component {
  /* this mock context is necessary for reactxp to work without errors… ¯\_(ツ)_/¯ */

  static childContextTypes = {
    focusManager: object
  };

  getChildContext() {
    return {
      focusManager: {
        addFocusableComponent() {},
        removeFocusableComponent() {},
        restrictFocusWithin() {},
        removeFocusRestriction() {},
        limitFocusWithin() {},
        removeFocusLimitation() {}
      }
    };
  }

  render() {
    return <View style={{ overflow: 'visible' }}>{this.props.children}</View>;
  }
}

export default Provider;
