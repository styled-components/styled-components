/* eslint-disable react/prop-types */
import { createElement } from 'react-native';
import React from 'react';
import styles from './styles';

const IconDirectMessage = props =>
  createElement('svg', {
    children: (
      <g>
        <path d="M43.34 14H12.66L28 27.946z" />
        <path d="M51.392 14.789L30.018 34.22c-.009.008-.028.006-.039.012-.563.5-1.266.768-1.98.768-.72 0-1.442-.258-2.017-.78L4.609 14.79A3.957 3.957 0 0 0 3 18v37a1.998 1.998 0 0 0 2 2c.464 0 .924-.162 1.292-.473L19 46h30c2.243 0 4-1.757 4-4V18a3.96 3.96 0 0 0-1.608-3.211z" />
      </g>
    ),
    style: [styles.icon, props.style],
    viewBox: '0 0 56 72'
  });

IconDirectMessage.metadata = { height: 72, width: 56 };

export default IconDirectMessage;
