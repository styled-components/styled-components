import classnames from 'classnames';
import React from 'react';
import styles from './container-styles.css';
import View from './View';

const Container = ({ theme = 'light', isPending = false, ...other }) => {
  const getContainerBackground = theme => {
    switch (theme) {
      case 'dark':
        return 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)';
      case 'contrast':
        return 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)';
      case 'light':
      default:
        return 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)';
    }
  };

  const getBorderColor = theme => {
    if (theme === 'dark') return '#374151';
    if (theme === 'contrast') return '#6b7280';
    return '#e5e7eb';
  };

  const getBoxShadow = theme => {
    if (theme === 'dark') return '0 10px 25px rgba(0, 0, 0, 0.5)';
    if (theme === 'contrast') return '0 10px 25px rgba(0, 0, 0, 0.7)';
    return '0 10px 25px rgba(0, 0, 0, 0.1)';
  };

  const dynamicStyles = {
    background: getContainerBackground(theme),
    borderColor: getBorderColor(theme),
    boxShadow: getBoxShadow(theme),
    opacity: isPending ? 0.8 : 1,
  };

  return (
    <View
      {...other}
      className={classnames(styles.container, {
        [styles.pending]: isPending,
      })}
      style={dynamicStyles}
    />
  );
};

export default Container;
