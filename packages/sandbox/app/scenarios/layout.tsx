import type { ReactNode } from 'react';
import { ScenariosNav } from './nav';

export default function ScenariosLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ScenariosNav />
      {children}
    </>
  );
}
