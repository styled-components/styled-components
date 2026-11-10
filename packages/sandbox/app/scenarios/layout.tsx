import Link from 'next/link';
import type { ReactNode } from 'react';
import { routes } from './routes';

/** A plain link list (no styled components) so any scenario page can soft-navigate to any other. */
export default function ScenariosLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <nav aria-label="Scenarios" style={{ fontSize: 12, lineHeight: 1.8, marginBottom: 16 }}>
        <Link href="/scenarios">index</Link>
        {routes.map(route => (
          <span key={route.href}>
            {' | '}
            <Link href={`/scenarios/${route.href}`}>{route.href}</Link>
          </span>
        ))}
      </nav>
      {children}
    </>
  );
}
