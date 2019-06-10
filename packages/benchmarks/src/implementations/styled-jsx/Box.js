/* eslint-disable react/prop-types */
import classnames from 'classnames';
import React from 'react';
import { style } from './View';

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

export default ({ children, className, color, fixed, layout, outer, ...props }) => (
  <div className={classnames(fixed && 'fixed', className)} {...props}>
    {children}

    <style jsx>{style}</style>

    <style jsx>
      {`
        div {
          align-self: flex-start;
        }

        .fixed {
          height: 6px;
          width: 6px;
        }
      `}
    </style>

    <style jsx>
      {`
        div {
          flex-direction: ${layout === 'column' ? 'column' : 'row'};
          padding: ${outer ? '4px' : '0'};
          background-color: ${getColor(color)};
        }
      `}
    </style>
  </div>
);
