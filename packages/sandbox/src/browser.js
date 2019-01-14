import React from 'react';
import { hydrate } from 'react-dom';

import App from './App';

const render = Component => {
  hydrate(<Component />, document.querySelector('#react-root'));
};

render(App);

if (module.hot) {
  module.hot.accept('./App', () => {
    // eslint-disable-next-line global-require
    const { default: Component } = require('./App');
    render(Component);
  });
}
