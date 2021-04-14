import { useContext } from 'react';
import { Theme, ThemeContext } from '../models/ThemeProvider';

const useTheme = (): Theme | undefined => useContext(ThemeContext);

export default useTheme;
