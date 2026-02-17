import { jsx as _jsx } from "react/jsx-runtime";
import { CustomThemeProvider } from './components/theme-provider';
import { HomeContent } from './components/home-content';
export default function HomePage() {
    return (_jsx(CustomThemeProvider, { children: _jsx(HomeContent, {}) }));
}
