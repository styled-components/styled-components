'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styled from 'styled-components';

export default function NavClient() {
  const pathname = usePathname();

  return (
    <Nav>
      {[
        { href: '/global-style-test', label: 'Home' },
        { href: '/global-style-test/page-a', label: 'Page A' },
        { href: '/global-style-test/page-b', label: 'Page B' },
      ].map(({ href, label }) => (
        <NavLink key={href} href={href} $active={pathname === href}>
          {label}
        </NavLink>
      ))}
    </Nav>
  );
}

const Nav = styled.nav`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
`;

const NavLink = styled(Link)<{ $active: boolean }>`
  padding: 10px 20px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  color: ${p => (p.$active ? '#fff' : 'var(--sc-colors-text, #111827)')};
  background: ${p => (p.$active ? 'var(--sc-colors-primary, #0070f3)' : 'var(--sc-colors-surface, #f9fafb)')};
  border: 1px solid ${p => (p.$active ? 'var(--sc-colors-primary, #0070f3)' : 'var(--sc-colors-border, #e5e7eb)')};
  transition: background 0.15s;

  &:hover {
    background: ${p => (p.$active ? 'var(--sc-colors-primary, #0070f3)' : 'var(--sc-colors-border, #e5e7eb)')};
  }
`;
