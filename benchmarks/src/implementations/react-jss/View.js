/* eslint-disable react/prop-types */
import classnames from 'classnames';
import injectSheet from 'react-jss';
import React from 'react';

class View extends React.Component {
  render() {
    const { classes, className, ...other } = this.props;
    return <div {...other} className={classnames(classes.root, className)} />;
  }
}

const styles = {
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
};

export default injectSheet(styles)(View);
