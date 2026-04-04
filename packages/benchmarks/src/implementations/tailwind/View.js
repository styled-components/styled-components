import React from 'react';

const View = React.forwardRef(({ className, ...other }, ref) => (
  <div
    ref={ref}
    className={'flex flex-col items-stretch shrink-0 basis-auto border-0 border-solid box-border relative m-0 p-0 min-h-0 min-w-0' + (className ? ' ' + className : '')}
    {...other}
  />
));

View.displayName = 'View';

export default View;
