/* eslint-disable react/prop-types */
import { createElement } from 'react-native';
import React from 'react';
import styles from './styles';

const IconRetweet = props =>
  createElement('svg', {
    children: (
      <g>
        <path d="M70.676 36.644A3 3 0 0 0 68 35h-7V19a4 4 0 0 0-4-4H34a4 4 0 0 0 0 8h18a1 1 0 0 1 1 .998V35h-7a3.001 3.001 0 0 0-2.419 4.775l11 15a3.003 3.003 0 0 0 4.839-.001l11-15a3.001 3.001 0 0 0 .256-3.13zM40.001 48H22a.995.995 0 0 1-.992-.96L21.001 36h7a3.001 3.001 0 0 0 2.419-4.775l-11-15a3.003 3.003 0 0 0-4.839.001l-11 15A3 3 0 0 0 6.001 36h7l.011 16.003a4 4 0 0 0 4 3.997h22.989a4 4 0 0 0 0-8z" />
      </g>
    ),
    style: [styles.icon, props.style],
    viewBox: '0 0 74 72'
  });

IconRetweet.metadata = { height: 72, width: 74 };

export default IconRetweet;
