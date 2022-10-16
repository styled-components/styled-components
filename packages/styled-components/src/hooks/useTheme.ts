import { useContext } from 'react';
import type { DefaultTheme} from '../models/ThemeProvider';
import { ThemeContext } from '../models/ThemeProvider';

const useTheme = (): DefaultTheme | undefined => useContext(ThemeContext);

export default useTheme;
