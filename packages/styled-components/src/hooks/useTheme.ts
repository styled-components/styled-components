import { useContext } from 'react';
import { DefaultTheme, ThemeContext } from '../models/ThemeProvider';

const useTheme = (): DefaultTheme | undefined => useContext(ThemeContext);

export default useTheme;
