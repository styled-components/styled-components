// @flow
import { useContext } from 'react';
import { ThemeContext } from '../models/ThemeProvider';

const useTheme = () => {
  const outerTheme = useContext(ThemeContext);
  return outerTheme;
}

export default useTheme;
