/* eslint-disable react/prop-types */
import React from 'react';
import { css, StyleSheet } from 'aphrodite';

class View extends React.Component {
  render() {
    const { style, ...other } = this.props;
    return <div {...other} className={css(styles.root, style)} />;
  }
}

const styles = StyleSheet.create({
  root: {
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
    // fix flexbox bugs
    minHeight: 0,
    minWidth: 0
  }
});

export default View;
