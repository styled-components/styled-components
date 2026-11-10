import type { TextInput } from 'react-native';
import type { TargetProps } from '../types';

/**
 * Props a styled `TextInput` takes that React Native's `TextInput` types do not
 * declare. `disabled` makes the input non-editable and drives `:disabled`.
 */
export interface StyledTextInputProps {
  disabled?: boolean | undefined;
}

/**
 * {@link TargetProps} for the native entry. A `TextInput` target (or a subclass)
 * gains {@link StyledTextInputProps}; every other target resolves exactly as in
 * the shared types, which must stay free of `react-native` imports because they
 * feed the web entry's declarations.
 *
 * The check is non-distributive so a union of targets keeps its shared
 * resolution rather than splitting per member.
 */
export type NativeTargetProps<T> = [T] extends [typeof TextInput]
  ? TargetProps<'native', T> & StyledTextInputProps
  : TargetProps<'native', T>;
