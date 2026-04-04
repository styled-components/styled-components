import React from 'react';

const Dot = ({ size, x, y, children, color }) => (
  <div
    className="flex items-stretch shrink-0 basis-auto border-0 border-solid box-border relative m-0 p-0 min-h-0 min-w-0 absolute cursor-pointer w-0 h-0 border-transparent border-t-0 translate-x-1/2 translate-y-1/2"
    style={{
      borderBottomColor: color,
      borderRightWidth: size / 2 + 'px',
      borderBottomWidth: size / 2 + 'px',
      borderLeftWidth: size / 2 + 'px',
      marginLeft: x + 'px',
      marginTop: y + 'px',
    }}
  >
    {children}
  </div>
);

export default Dot;
