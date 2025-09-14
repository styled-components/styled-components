import React from 'react';
import View from './View';

const Container = ({ theme = 'light', isPending = false, style, ...other }) => {
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

  const containerStyle = {
    width: '100%',
    maxWidth: 1200,
    maxHeight: 800,
    overflow: 'auto',
    padding: 16,
    borderRadius: 8,
    background: getContainerBackground(theme),
    border: `1px solid ${getBorderColor(theme)}`,
    boxShadow: getBoxShadow(theme),
    opacity: isPending ? 0.8 : 1,
    transition: 'opacity 0.3s ease',
    position: 'relative',
  };

  // Create the pending overlay as a pseudo-element using a child div
  const pendingOverlay = isPending ? (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        padding: '4px 8px',
        background: theme === 'light' ? '#3b82f6' : '#60a5fa',
        color: 'white',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 500,
        zIndex: 10,
      }}
    >
      Updating...
    </div>
  ) : null;

  return (
    <View {...other} style={{ ...containerStyle, ...style }}>
      {pendingOverlay}
      {other.children}
    </View>
  );
};

export default Container;
