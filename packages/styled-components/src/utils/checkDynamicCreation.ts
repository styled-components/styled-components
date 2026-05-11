import React from 'react';
import { fifoSet } from './fifoMap';
import { IS_RSC } from './isRsc';

const invalidHookCallRe = /invalid hook call/i;
const SEEN_LIMIT = 200;
const seen: Map<string, true> = new Map();

export const checkDynamicCreation = (displayName: string, componentId?: string | undefined) => {
  // RSC: components are module-level by construction and hook-detection is
  // unreliable across the server-component eval boundary.
  if (IS_RSC) return;

  const key = componentId ? displayName + '|' + componentId : displayName;

  // React 18+ logs invalid-hook-call to console.error rather than throwing,
  // so probe by calling a hook here and watch for that error.
  const originalConsoleError = console.error;
  try {
    let didNotCallInvalidHook = true;
    console.error = (consoleErrorMessage, ...consoleErrorArgs) => {
      if (invalidHookCallRe.test(consoleErrorMessage)) {
        didNotCallInvalidHook = false;
        seen.delete(key);
      } else {
        originalConsoleError(consoleErrorMessage, ...consoleErrorArgs);
      }
    };
    if (typeof React.useState === 'function') {
      React.useState(null);
    }

    if (didNotCallInvalidHook && !seen.has(key)) {
      const parsedIdString = componentId ? ` with the id of "${componentId}"` : '';
      console.warn(
        `[sc] the component ${displayName}${parsedIdString} has been created dynamically. You may see this warning because you've called styled inside another component. To resolve this only create new StyledComponents outside of any render method and function component. See https://styled-components.com/docs/basics#define-styled-components-outside-of-the-render-method for more info.`
      );
      fifoSet(seen, key, true, SEEN_LIMIT);
    }
  } catch (error) {
    if (invalidHookCallRe.test((error as Error).message)) {
      seen.delete(key);
    }
  } finally {
    console.error = originalConsoleError;
  }
};
