import { configure } from '@storybook/react';
import 'storybook-chromatic';

function loadStories() {
  require('./examples.js');
  // You can require as many stories as you need.
}

configure(loadStories, module);
