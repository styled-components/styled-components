// @flow

import { useRef } from 'react';

const invalidHookCallRe = /invalid hook call/i;

export const checkDynamicCreation = (displayName: string, componentId?: string) => {
  let warningSeen = false;

  return () => {
    if (process.env.NODE_ENV !== 'production') {
      try {
        useRef();
        if (!warningSeen) {
          warningSeen = true;
          const parsedIdString = componentId ? ` with the id of "${componentId}"` : '';
          console.warn(
            `The component ${displayName}${parsedIdString} has been created dynamically.\n` +
            'You may see this warning because you\'ve called styled inside another component.\n' +
            'To resolve this only create new StyledComponents outside of any render method and function component.'
          );
        }
      } catch (error) {
        // The error here is expected, since we're expecting anything that uses `checkDynamicCreation` to
        // be called outside of a React component.
        if (invalidHookCallRe.test(error.message)) {
          // This shouldn't happen, but resets `warningSeen` if we had this error happen intermittently
          warningSeen = false;
        }
      }
    }
  };
};
