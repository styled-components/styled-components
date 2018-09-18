/* eslint-disable react/prop-types */
import classnames from 'classnames';
import React from 'react';
import styles from './view-styles.css';

class View extends React.Component {
  render() {
    const props = this.props;
    return <div {...props} className={classnames(styles.initial, props.className)} />;
  }
}

export default View;
