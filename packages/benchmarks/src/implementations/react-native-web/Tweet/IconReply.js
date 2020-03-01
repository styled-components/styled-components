/* eslint-disable react/prop-types */
import { createElement } from 'react-native';
import React from 'react';
import styles from './styles';

const IconReply = props =>
  createElement('svg', {
    children: (
      <g>
        <path d="M41 31h-9V19a2.999 2.999 0 0 0-4.817-2.386l-21 16a3 3 0 0 0-.001 4.773l21 16a3.006 3.006 0 0 0 3.15.301A2.997 2.997 0 0 0 32 51V39h9c5.514 0 10 4.486 10 10a4 4 0 0 0 8 0c0-9.925-8.075-18-18-18z" />
      </g>
    ),
    style: [styles.icon, props.style],
    viewBox: '0 0 62 72'
  });

IconReply.metadata = { height: 72, width: 62 };

export default IconReply;
