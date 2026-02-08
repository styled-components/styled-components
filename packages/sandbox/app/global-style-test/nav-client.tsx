'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavClient() {
  const pathname = usePathname();

  return (
    <nav style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
      {[
        { href: '/global-style-test', label: 'Unmount Test' },
        { href: '/global-style-test/page-a', label: 'Page A' },
        { href: '/global-style-test/page-b', label: 'Page B' },
      ].map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 700,
            color: '#fff',
            background: pathname === href ? '#e94560' : 'rgba(255,255,255,0.08)',
            transition: 'all 0.2s',
          }}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
