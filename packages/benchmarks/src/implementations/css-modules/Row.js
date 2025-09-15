import classnames from 'classnames';
import React from 'react';
import styles from './row-styles.css';
import View from './View';

const Row = ({ theme = 'light', index = 0, ...other }) => {
  const dynamicStyles = {
    backgroundColor: (() => {
      if (index % 2 === 0) return 'transparent';
      if (theme === 'dark') return 'rgba(255, 255, 255, 0.02)';
      if (theme === 'contrast') return 'rgba(255, 255, 255, 0.05)';
      return 'rgba(0, 0, 0, 0.02)';
    })(),
  };

  return <View {...other} className={classnames(styles.row)} style={dynamicStyles} />;
};

export default Row;
