import React from 'react';
import {
  computeHeavyValues,
  getPriorityAccent,
  getSizeScale,
  getStateColor,
  getTextColor,
} from '../../shared/createCell';
import View from './View';

const Cell = ({
  state = 'idle',
  theme = 'light',
  isPending = false,
  intensity = 1,
  size = 'medium',
  priority = 'low',
  suspend = false,
  rowIndex = 0,
  abortSignal = null,
  style,
  ...other
}) => {
  if (suspend) {
    throw new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => resolve(null), 50 * (rowIndex % 5) || 50);

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error('Cell suspend aborted'));
        });
      }
    });
  }

  // Heavy computation here for inline-styles
  const heavyValues = computeHeavyValues(other);
  const sizeScale = getSizeScale(size);

  const cellStyle = {
    minWidth: 50 * sizeScale,
    minHeight: 35 * sizeScale,
    padding: 6 * sizeScale,
    margin: 2,
    borderRadius: 4 * sizeScale,
    background: `linear-gradient(135deg, ${getStateColor(state, theme, intensity)}, ${getStateColor(state, theme, intensity * 0.8)})`,
    color: getTextColor(state, theme, intensity),
    fontSize: 11 * sizeScale,
    fontWeight: (() => {
      if (priority === 'critical') return 'bold';
      if (state === 'success' || priority === 'high') return '600';
      return 'normal';
    })(),
    opacity: isPending ? 0.6 : 0.9 + intensity * 0.1,
    transform: `scale(${(() => {
      let baseScale = sizeScale;
      if (state === 'loading') baseScale *= 1.05;
      if (priority === 'critical') baseScale *= 1.1;
      if (state === 'error') baseScale *= 1.08;
      return baseScale;
    })()}) rotate(${(() => {
      if (state === 'error') return `${intensity * 2 - 1}deg`;
      if (priority === 'critical') return `${intensity * 1.5 - 0.75}deg`;
      return '0deg';
    })()})`,
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    border: `3px solid ${heavyValues.$borderColor || getPriorityAccent(priority, intensity)}`,
    boxShadow: `
      0 2px 8px ${getPriorityAccent(priority, heavyValues.$shadowIntensity || intensity * 0.5)},
      inset 0 1px 0 rgba(255, 255, 255, ${intensity * 0.2})
    `,
    textShadow: (() => {
      const shadowIntensity = heavyValues.$shadowIntensity || intensity * 0.5;
      if (theme === 'light' && state === 'idle') return 'none';
      return `0 1px 2px rgba(0, 0, 0, ${shadowIntensity})`;
    })(),
    cursor: 'pointer',
    position: 'relative',
  };

  const hoverStyle = {
    transform: `scale(${getSizeScale(size) * 1.12}) rotate(${state === 'error' ? '2deg' : '-1deg'})`,
    zIndex: 5,
    boxShadow: `
      0 4px 16px ${getPriorityAccent(priority, intensity)},
      inset 0 1px 0 rgba(255, 255, 255, ${intensity * 0.3})
    `,
  };

  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <View
      {...other}
      style={{
        ...cellStyle,
        ...(isHovered ? hoverStyle : {}),
        ...style,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    />
  );
};

export default Cell;
