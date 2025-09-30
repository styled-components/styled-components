import React from 'react';

// Shared utility functions for Cell component
export const getStateColor = (state, theme, intensity = 1) => {
  const baseColors = {
    dark: {
      idle: [42, 42, 42],
      loading: [59, 130, 246],
      success: [16, 185, 129],
      error: [239, 68, 68],
      warning: [245, 158, 11],
    },
    light: {
      idle: [248, 249, 250],
      loading: [59, 130, 246],
      success: [34, 197, 94],
      error: [239, 68, 68],
      warning: [245, 158, 11],
    },
    contrast: {
      idle: [26, 26, 26],
      loading: [14, 165, 233],
      success: [5, 150, 105],
      error: [220, 38, 38],
      warning: [217, 119, 6],
    },
  };

  const [r, g, b] = baseColors[theme]?.[state] || baseColors.light.idle;

  // Apply intensity to make colors more vibrant
  const adjustedR = Math.min(255, Math.floor(r + (255 - r) * intensity * 0.3));
  const adjustedG = Math.min(255, Math.floor(g + (255 - g) * intensity * 0.3));
  const adjustedB = Math.min(255, Math.floor(b + (255 - b) * intensity * 0.3));

  return `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`;
};

export const getPriorityAccent = (priority, intensity = 1) => {
  const colors = {
    low: `rgba(99, 102, 241, ${0.2 * intensity})`,
    medium: `rgba(245, 158, 11, ${0.4 * intensity})`,
    high: `rgba(239, 68, 68, ${0.6 * intensity})`,
    critical: `rgba(220, 38, 38, ${0.8 * intensity})`,
  };
  return colors[priority] || colors.low;
};

export const getSizeScale = size => {
  switch (size) {
    case 'small':
      return 0.85;
    case 'large':
      return 1.15;
    case 'medium':
    default:
      return 1;
  }
};

export const getTextColor = (state, theme, intensity = 1) => {
  if (theme === 'light' && state === 'idle') {
    return '#374151';
  }
  const baseOpacity = theme === 'light' ? 0.9 : 1;
  return `rgba(255, 255, 255, ${baseOpacity * intensity})`;
};

// Heavy computation for render (simulates expensive prop transforms)
export const computeHeavyValues = props => {
  let hash = 0;
  const input = props.value + props.lastUpdated + props.intensity * 10;
  // Moderate loop to simulate work (up to ~100 iterations)
  for (let i = 0; i < Math.min(input % 100, 100); i++) {
    hash = ((hash << 5) - hash + i * props.intensity) | 0;
  }
  const computedBorderColor = `hsl(${hash % 360}, 70%, 50%)`;
  const computedShadowIntensity = (hash % 100) / 100;
  return {
    $borderColor: computedBorderColor,
    $shadowIntensity: computedShadowIntensity,
  };
};

// Factory function to create Cell component with any styled function
export default function createCell(styled, View) {
  const StyledCell = styled(View)`
    min-width: ${props => 50 * getSizeScale(props.size)}px;
    min-height: ${props => 35 * getSizeScale(props.size)}px;
    padding: ${props => 6 * getSizeScale(props.size)}px;
    margin: 2px;
    border-radius: ${props => 4 * getSizeScale(props.size)}px;

    background: linear-gradient(
      135deg,
      ${props => getStateColor(props.state, props.theme, props.intensity)},
      ${props => getStateColor(props.state, props.theme, props.intensity * 0.8)}
    );

    color: ${props => getTextColor(props.state, props.theme, props.intensity)};
    font-size: ${props => 11 * getSizeScale(props.size)}px;
    font-weight: ${props => {
      if (props.priority === 'critical') return 'bold';
      if (props.state === 'success' || props.priority === 'high') return '600';
      return 'normal';
    }};

    opacity: ${props => (props.isPending ? 0.6 : 0.9 + props.intensity * 0.1)};

    transform: scale(
        ${props => {
          let baseScale = getSizeScale(props.size);
          if (props.state === 'loading') baseScale *= 1.05;
          if (props.priority === 'critical') baseScale *= 1.1;
          if (props.state === 'error') baseScale *= 1.08;
          return baseScale;
        }}
      )
      rotate(
        ${props => {
          if (props.state === 'error') return `${props.intensity * 2 - 1}deg`;
          if (props.priority === 'critical') return `${props.intensity * 1.5 - 0.75}deg`;
          return '0deg';
        }}
      );

    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

    border: 3px solid
      ${props => props.$borderColor || getPriorityAccent(props.priority, props.intensity)};
    box-shadow:
      0 2px 8px
        ${props =>
          getPriorityAccent(props.priority, props.$shadowIntensity || props.intensity * 0.5)},
      inset 0 1px 0 rgba(255, 255, 255, ${props => props.intensity * 0.2});

    text-shadow: ${props => {
      const shadowIntensity = props.$shadowIntensity || props.intensity * 0.5;
      if (props.theme === 'light' && props.state === 'idle') return 'none';
      return `0 1px 2px rgba(0, 0, 0, ${shadowIntensity})`;
    }};

    &:hover {
      transform: scale(${props => getSizeScale(props.size) * 1.12})
        rotate(${props => (props.state === 'error' ? '2deg' : '-1deg')});
      z-index: 5;
      box-shadow:
        0 4px 16px ${props => getPriorityAccent(props.priority, props.intensity)},
        inset 0 1px 0 rgba(255, 255, 255, ${props => props.intensity * 0.3});
    }
  `;

  // Wrapper to handle heavy computation and suspend
  const Cell = props => {
    if (props.suspend) {
      throw new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => resolve(null), 50 * ((props.rowIndex || 0) % 5) || 50);

        // Cancel timeout if abort signal is triggered
        if (props.abortSignal) {
          props.abortSignal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error('Cell suspend aborted'));
          });
        }
      });
    }

    // Always do heavy computation here for consistency
    const heavyValues = computeHeavyValues(props);
    return <StyledCell {...props} {...heavyValues} />;
  };

  Cell.defaultProps = {
    'data-testid': 'cell',
    state: 'idle',
    theme: 'light',
    isPending: false,
    intensity: 1,
    size: 'medium',
    priority: 'low',
    suspend: false,
    abortSignal: null,
  };

  return Cell;
}
