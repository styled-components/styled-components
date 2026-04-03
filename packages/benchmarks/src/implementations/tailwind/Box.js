import React from 'react';
import View from './View';

const colorClasses = {
  0: 'bg-[#14171A]',
  1: 'bg-[#AAB8C2]',
  2: 'bg-[#E6ECF0]',
  3: 'bg-[#FFAD1F]',
  4: 'bg-[#F45D22]',
  5: 'bg-[#E0245E]',
};

const Box = ({ color, fixed = false, layout = 'column', outer = false, ...other }) => {
  const classes = [
    'self-start',
    colorClasses[color] || '',
    layout === 'row' ? 'flex-row' : '',
    outer ? 'p-1' : '',
    fixed ? 'h-1.5 w-1.5' : '',
  ].join(' ');

  return <View className={classes} {...other} />;
};

export default Box;
