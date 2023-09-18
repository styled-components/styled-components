/**
 * This file is meant for typing-related tests that don't need to go through Jest.
 */
import React from 'react';
import styledNative from '../index';

/**
 * Props incorrectly typed using styled components native
 * https://github.com/styled-components/styled-components/issues/4165
 */
const NativeWrapper = styledNative.View<{ foo?: boolean }>`
  ${props => props.foo && 'color: red;'}
`;

const NativeComponent = () => {
  return <NativeWrapper foo />;
};
