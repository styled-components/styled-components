/* eslint-disable react/prop-types */
import React from 'react';
import View from './View';

const Dot = props => {
  const { className, children: styles } = (
    <scope className="Dot">
      <style jsx>{`
        .Dot {
          position: absolute;
          cursor: pointer;
          width: 0;
          height: 0;
          border-color: transparent;
          border-style: solid;
          border-top-width: 0;
          transform: translate(50%, 50%);
        }
      `}</style>
      <style jsx>{`
        .Dot {
          margin-left: ${props.x}px;
          margin-top: ${props.y}px;
          border-right-width: ${props.size / 2}px;
          border-bottom-width: ${props.size / 2}px;
          border-left-width: ${props.size / 2}px;
          border-bottom-color: ${props.color};
        }
      `}</style>
    </scope>
  ).props;

  return <View className={className}>{[props.children, styles]}</View>;
};

export default Dot;
