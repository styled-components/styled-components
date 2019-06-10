/* eslint-disable react/prop-types */
import React from 'react';
import { css, StyleSheet } from 'aphrodite/no-important';

const baseStyles = StyleSheet.create({
  base: {
    alignItems: 'stretch',
    borderWidth: 0,
    borderStyle: 'solid',
    boxSizing: 'border-box',
    display: 'flex',
    flexBasis: 'auto',
    flexDirection: 'column',
    flexShrink: 0,
    margin: 0,
    padding: 0,
    position: 'relative',
    minHeight: 0,
    minWidth: 0,
  },
});

export default function View({ styles, ...props }) {
  return <div {...props} className={css(baseStyles.base, styles)} />;
}
