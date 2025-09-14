import { createElement, StyleSheet } from 'react-native';

const Container = ({ theme = 'light', isPending = false, children, ...other }) => {
  const getContainerBackground = theme => {
    switch (theme) {
      case 'dark':
        return '#1a1a1a';
      case 'contrast':
        return '#000000';
      case 'light':
      default:
        return '#ffffff';
    }
  };

  const getBorderColor = theme => {
    if (theme === 'dark') return '#374151';
    if (theme === 'contrast') return '#6b7280';
    return '#e5e7eb';
  };

  const dynamicStyle = {
    backgroundColor: getContainerBackground(theme),
    borderColor: getBorderColor(theme),
    opacity: isPending ? 0.8 : 1,
  };

  // Create the pending overlay
  const pendingOverlay = isPending
    ? createElement('div', {
        style: [
          styles.pendingOverlay,
          {
            backgroundColor: theme === 'light' ? '#3b82f6' : '#60a5fa',
          },
        ],
        children: 'Updating...',
      })
    : null;

  return createElement('div', {
    ...other,
    style: [styles.container, dynamicStyle],
    children: [pendingOverlay, children].filter(Boolean),
  });
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 1200,
    maxHeight: 800,
    overflow: 'auto',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    position: 'relative',
  },
  pendingOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    paddingHorizontal: 8,
    color: 'white',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '500',
    zIndex: 10,
  },
});

export default Container;
