import { CustomThemeProvider } from '../components/theme-provider';
import { ClientTestingHarness } from './testing-harness';

export default function ClientExamplePage() {
  return (
    <CustomThemeProvider>
      <ClientTestingHarness />
    </CustomThemeProvider>
  );
}
