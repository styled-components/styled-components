/* eslint-disable react/prop-types */
import classnames from 'classnames';
import React from 'react';
import View from './View';

const getColor = color => {
  switch (color) {
    case 0:
      return '#14171A';
    case 1:
      return '#AAB8C2';
    case 2:
      return '#E6ECF0';
    case 3:
      return '#FFAD1F';
    case 4:
      return '#F45D22';
    case 5:
      return '#E0245E';
    default:
      return 'transparent';
  }
};

const Box = props => {
  const { className, children: styles } = (
    <scope className={classnames('Box', props.fixed && 'fixed')}>
      <style jsx>{`
        .Box {
          align-self: flex-start;
          flex-direction: ${props.layout === 'column' ? 'column' : 'row'};
          padding: ${props.outer ? '4px' : '0'};
          background-color: ${getColor(props.color)};
        }
        .fixed {
          height: 6px;
          width: 6px;
        }
      `}</style>
    </scope>
  ).props;

  return <View className={className}>{[props.children, styles]}</View>;
};

export default Box;
