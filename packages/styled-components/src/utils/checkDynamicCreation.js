// @flow

import { useRef } from 'react';

const invalidHookCallRe = /invalid hook call/i;
const seen = new Set();

export const checkDynamicCreation = (displayName: string, componentId?: string) => {
  if (process.env.NODE_ENV !== 'production') {
    const parsedIdString = componentId ? ` with the id of "${componentId}"` : '';
    const message =
      `The component ${displayName}${parsedIdString} has been created dynamically.\n` +
      "You may see this warning because you've called styled inside another component.\n" +
      'To resolve this only create new StyledComponents outside of any render method and function component.';

    // If a hook is called outside of a component:
    // React 17 and earlier throw an error
    // React 18 and above use console.error

    const originalConsoleError = console.error // eslint-disable-line no-console
    try {
      let didNotCallInvalidHook = true
      /* $FlowIgnore[cannot-write] */
      console.error = (consoleErrorMessage, ...consoleErrorArgs) => { // eslint-disable-line no-console
      // The error here is expected, since we're expecting anything that uses `checkDynamicCreation` to
      // be called outside of a React component.
        if (invalidHookCallRe.test(consoleErrorMessage)) {
          didNotCallInvalidHook = false
          // This shouldn't happen, but resets `warningSeen` if we had this error happen intermittently
          seen.delete(message);
        } else {
          originalConsoleError(consoleErrorMessage, ...consoleErrorArgs);
        }
      }
      // We purposefully call `useRef` outside of a component and expect it to throw
      // If it doesn't, then we're inside another component.
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useRef();

      if (didNotCallInvalidHook && !seen.has(message)) {
        // eslint-disable-next-line no-console
        console.warn(message);
        seen.add(message);
      }
    } catch (error) {
      // The error here is expected, since we're expecting anything that uses `checkDynamicCreation` to
      // be called outside of a React component.
      if (invalidHookCallRe.test(error.message)) {
        // This shouldn't happen, but resets `warningSeen` if we had this error happen intermittently
        seen.delete(message);
      }
    } finally {
      /* $FlowIgnore[cannot-write] */
      console.error = originalConsoleError; // eslint-disable-line no-console
    }
  }
};
