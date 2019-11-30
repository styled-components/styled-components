// @flow
import { useContext } from 'react';
import { ThemeContext } from '../models/ThemeProvider';

const useTheme = () => useContext(ThemeContext);

export default useTheme;
