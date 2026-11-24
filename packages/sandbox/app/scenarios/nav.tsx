'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { routes } from './routes';

const linkStyle = {
  color: 'var(--sc-colors-textMuted)',
  fontFamily: 'var(--sc-typography-fontFamilyMono, ui-monospace, monospace)',
  fontSize: 12,
  textDecoration: 'none',
} as const;

/** Minimal prev/next stepper shown only on individual scenario pages (not the index). */
export function ScenariosNav() {
  const pathname = usePathname();
  if (pathname === '/scenarios' || !pathname.startsWith('/scenarios/')) return null;

  const slug = pathname.slice('/scenarios/'.length);
  const index = routes.findIndex(route => route.href === slug);
  if (index === -1) return null;

  const prev = routes[(index + routes.length - 1) % routes.length];
  const next = routes[(index + 1) % routes.length];

  return (
    <nav
      aria-label="Scenarios"
      style={{
        alignItems: 'center',
        borderBottom: '1px solid var(--sc-colors-border)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingBottom: 12,
      }}
    >
      <Link
        href="/scenarios"
        style={{ ...linkStyle, color: 'var(--sc-colors-text)', fontWeight: 600 }}
      >
        ← All scenarios
      </Link>
      <div style={{ display: 'flex', gap: 16 }}>
        <Link href={`/scenarios/${prev.href}`} style={linkStyle}>
          ← {prev.href}
        </Link>
        <Link href={`/scenarios/${next.href}`} style={linkStyle}>
          {next.href} →
        </Link>
      </div>
    </nav>
  );
}
