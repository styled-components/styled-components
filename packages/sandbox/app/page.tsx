import { CustomThemeProvider } from './components/theme-provider';
import { HomeContent } from './components/home-content';

export default function HomePage() {
  return (
    <CustomThemeProvider>
      <HomeContent />
    </CustomThemeProvider>
  );
}
