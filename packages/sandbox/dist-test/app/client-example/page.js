import { jsx as _jsx } from "react/jsx-runtime";
import { CustomThemeProvider } from '../components/theme-provider';
import { ClientTestingHarness } from './testing-harness';
export default function ClientExamplePage() {
    return (_jsx(CustomThemeProvider, { children: _jsx(ClientTestingHarness, {}) }));
}
