'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styled from 'styled-components';
import theme from '../lib/theme';
import { useThemeToggle } from './theme-provider';

const sections = [
  {
    title: 'Tests',
    items: [
      { href: '/rsc', label: 'RSC' },
      { href: '/client-example', label: 'Client Components' },
      { href: '/global-style-test', label: 'Global Styles' },
    ],
  },
  {
    title: 'Performance',
    items: [
      { href: '/perf/data-grid', label: 'Data Grid' },
      { href: '/perf/dashboard', label: 'Dashboard' },
      { href: '/perf/form', label: 'Form' },
      { href: '/perf/list', label: 'List' },
      { href: '/perf/types', label: 'Types' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const themeToggle = useThemeToggle();

  return (
    <Nav>
      <Brand href="/">SC Sandbox</Brand>
      {sections.map(section => (
        <Section key={section.title}>
          <SectionTitle>{section.title}</SectionTitle>
          {section.items.map(item => (
            <NavLink
              key={item.href}
              href={item.href}
              $active={
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href + '/'))
              }
            >
              {item.label}
            </NavLink>
          ))}
        </Section>
      ))}
      {themeToggle && (
        <Footer>
          <ThemeButton onClick={themeToggle.toggle}>{themeToggle.label}</ThemeButton>
        </Footer>
      )}
    </Nav>
  );
}

const Nav = styled.nav`
  width: 180px;
  flex-shrink: 0;
  border-right: 1px solid ${theme.colors.border};
  padding: ${theme.spacing.medium};
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
`;

const Brand = styled(Link)`
  font-size: ${theme.typography.fontSize.small};
  font-weight: 700;
  color: ${theme.colors.text};
  text-decoration: none;
  padding: ${theme.spacing.small};
  margin-bottom: ${theme.spacing.small};

  &:hover {
    color: ${theme.colors.primary};
  }
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: ${theme.spacing.small};
`;

const SectionTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 4px ${theme.spacing.small};
`;

const NavLink = styled(Link)<{ $active: boolean }>`
  display: block;
  padding: 6px ${theme.spacing.small};
  border-radius: 6px;
  font-size: 13px;
  text-decoration: none;
  color: ${p => (p.$active ? theme.colors.primary : theme.colors.textMuted)};
  background: ${p => (p.$active ? theme.colors.surface : 'transparent')};
  font-weight: ${p => (p.$active ? 600 : 400)};

  &:hover {
    background: ${theme.colors.surface};
    color: ${theme.colors.text};
  }
`;

const Footer = styled.div`
  margin-top: auto;
  padding-top: ${theme.spacing.small};
`;

const ThemeButton = styled.button`
  display: block;
  width: 100%;
  padding: 6px ${theme.spacing.small};
  border-radius: 6px;
  font-size: 12px;
  text-align: left;
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.border};
  color: ${theme.colors.text};
  cursor: pointer;

  &:hover {
    border-color: ${theme.colors.primary};
    color: ${theme.colors.primary};
  }
`;
