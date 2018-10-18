/* eslint-disable react/prop-types */
import { createElement } from 'react-native';
import React from 'react';
import styles from './styles';

const IconHeart = props =>
  createElement('svg', {
    children: (
      <g>
        <path d="M38.723 12c-7.187 0-11.16 7.306-11.723 8.131C26.437 19.306 22.504 12 15.277 12 8.791 12 3.533 18.163 3.533 24.647 3.533 39.964 21.891 55.907 27 56c5.109-.093 23.467-16.036 23.467-31.353C50.467 18.163 45.209 12 38.723 12z" />
      </g>
    ),
    style: [styles.icon, props.style],
    viewBox: '0 0 54 72'
  });

IconHeart.metadata = { height: 72, width: 54 };

export default IconHeart;
