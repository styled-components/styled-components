'use client';

import Link from 'next/link';
import { useState } from 'react';
import styled, { css } from 'styled-components';
import {
  generateActivity,
  generateStats,
  mulberry32,
  type ActivityItem,
  type DashboardStat,
} from '../lib/data-generators';
import { TimerDisplay } from '../lib/timer-display';
import { useAutoRun, useRenderTimer } from '../lib/use-render-timer';
import theme from '../../lib/theme';

const NAV_ITEMS = [
  { href: '/perf/dashboard', label: 'Overview', icon: '⬡' },
  { href: '/perf/dashboard#analytics', label: 'Analytics', icon: '▲' },
  { href: '/perf/dashboard#users', label: 'Users', icon: '◎' },
  { href: '/perf/dashboard#deploy', label: 'Deployments', icon: '◈' },
  { href: '/perf/dashboard#infra', label: 'Infrastructure', icon: '◰' },
  { href: '/perf/dashboard#logs', label: 'Logs', icon: '≡' },
  { href: '/perf/dashboard#alerts', label: 'Alerts', icon: '◬' },
  { href: '/perf/dashboard#settings', label: 'Settings', icon: '⚙' },
];

const TABLE_HEADERS = [
  'Service',
  'Version',
  'Region',
  'Status',
  'Req/s',
  'P99 (ms)',
  'Error %',
  'Updated',
];

function makeTableRows(count: number, seed?: number) {
  const services = [
    'api-gateway',
    'auth-service',
    'user-service',
    'billing',
    'notifications',
    'search',
    'cdn',
    'db-proxy',
    'cache',
    'queue',
  ];
  const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];
  const rowStatuses = ['healthy', 'degraded', 'deploying', 'offline'] as const;
  const rand = seed !== undefined ? mulberry32(seed) : Math.random;
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    service: services[i % services.length],
    version: `v${1 + (i % 4)}.${i % 10}.${i % 3}`,
    region: regions[i % regions.length],
    status: rowStatuses[i % rowStatuses.length],
    rps: Math.floor(rand() * 5000),
    p99: Math.floor(rand() * 800),
    errorPct: (rand() * 5).toFixed(2),
    updated: `${i * 2}m ago`,
  }));
}

interface DashboardData {
  stats: DashboardStat[];
  activity: ActivityItem[];
  tableRows: ReturnType<typeof makeTableRows>;
}

function freshData(seed?: number): DashboardData {
  return {
    stats: generateStats(8, seed),
    activity: generateActivity(15, seed !== undefined ? seed + 100 : undefined),
    tableRows: makeTableRows(20, seed !== undefined ? seed + 200 : undefined),
  };
}

const initialData = freshData(42);

export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState('/perf/dashboard');
  const [data, setData] = useState<DashboardData>(initialData);
  const { timings, markStart, clear } = useRenderTimer();

  function refresh() {
    markStart('Refresh Dashboard');
    setData(freshData());
  }

  const { autoRun, start, stop } = useAutoRun(refresh, 50);

  return (
    <Shell>
      <Sidebar>
        <SidebarBrand>
          <BrandIcon>◈</BrandIcon>
          <BrandName>Nexus</BrandName>
        </SidebarBrand>
        <SidebarNav>
          {NAV_ITEMS.map(item => (
            <NavItem
              key={item.href}
              href={item.href}
              $active={activeNav === item.href}
              onClick={() => setActiveNav(item.href)}
            >
              <NavIcon>{item.icon}</NavIcon>
              {item.label}
            </NavItem>
          ))}
        </SidebarNav>
        <SidebarFooter>
          <UserAvatar>EJ</UserAvatar>
          <UserInfo>
            <UserName>Evan Jacobs</UserName>
            <UserRole>Admin</UserRole>
          </UserInfo>
        </SidebarFooter>
      </Sidebar>

      <Content>
        <Header>
          <HeaderLeft>
            <PageTitle>Overview</PageTitle>
            <Breadcrumb>
              <BreadcrumbItem>Nexus</BreadcrumbItem>
              <BreadcrumbSep>/</BreadcrumbSep>
              <BreadcrumbItem $current>Overview</BreadcrumbItem>
            </Breadcrumb>
          </HeaderLeft>
          <HeaderRight>
            <HeaderMeta>
              <MetaItem>Last updated: just now</MetaItem>
              <MetaDot />
              <MetaItem>8 services</MetaItem>
            </HeaderMeta>
            <RefreshButton onClick={refresh}>Refresh Dashboard</RefreshButton>
          </HeaderRight>
        </Header>

        <TimerDisplay
          timings={timings}
          onClear={clear}
          autoRun={autoRun}
          onAutoStart={start}
          onAutoStop={stop}
        />

        <StatsGrid>
          {data.stats.map(stat => (
            <StatCard key={stat.id} $status={stat.status}>
              <StatLabel>{stat.label}</StatLabel>
              <StatValue>{stat.value.toLocaleString()}</StatValue>
              <StatChange $positive={stat.change >= 0}>
                {stat.change >= 0 ? '↑' : '↓'} {Math.abs(stat.change).toFixed(1)}%
              </StatChange>
              <StatIndicator $status={stat.status} />
            </StatCard>
          ))}
        </StatsGrid>

        <TwoCol>
          <TableSection>
            <SectionHeader>
              <SectionTitle>Services</SectionTitle>
              <SectionCount>{data.tableRows.length} total</SectionCount>
            </SectionHeader>
            <TableWrapper>
              <Table>
                <thead>
                  <TableRow>
                    {TABLE_HEADERS.map(h => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </thead>
                <tbody>
                  {data.tableRows.map(row => (
                    <TableRow key={row.id} $clickable>
                      <TableCell>
                        <ServiceName>{row.service}</ServiceName>
                      </TableCell>
                      <TableCell>
                        <VersionTag>{row.version}</VersionTag>
                      </TableCell>
                      <TableCell>{row.region}</TableCell>
                      <TableCell>
                        <RowStatusBadge $status={row.status}>{row.status}</RowStatusBadge>
                      </TableCell>
                      <TableCell $numeric>{row.rps.toLocaleString()}</TableCell>
                      <TableCell $numeric>{row.p99}</TableCell>
                      <TableCell $numeric>{row.errorPct}%</TableCell>
                      <TableCell>{row.updated}</TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          </TableSection>

          <ActivitySection>
            <SectionHeader>
              <SectionTitle>Activity</SectionTitle>
              <SectionCount>{data.activity.length} recent</SectionCount>
            </SectionHeader>
            <ActivityList>
              {data.activity.map(item => (
                <ActivityEntry key={item.id}>
                  <ActivityAvatar>{item.user[0]}</ActivityAvatar>
                  <ActivityBody>
                    <ActivityText>
                      <ActivityUser>{item.user}</ActivityUser> {item.action}
                    </ActivityText>
                    <ActivityTime>{new Date(item.timestamp).toLocaleTimeString()}</ActivityTime>
                  </ActivityBody>
                  <StatusBadge $status={item.status}>{item.status}</StatusBadge>
                </ActivityEntry>
              ))}
            </ActivityList>
          </ActivitySection>
        </TwoCol>
      </Content>
    </Shell>
  );
}

const Shell = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${p => p.theme.colors.background};
  font-family: ${p => p.theme.typography.fontFamily};
  margin: calc(-1 * ${theme.spacing.large});
`;

const Sidebar = styled.aside`
  width: 220px;
  flex-shrink: 0;
  background: ${p => p.theme.colors.surface};
  border-right: 1px solid ${p => p.theme.colors.border};
  display: flex;
  flex-direction: column;
`;

const SidebarBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px 16px;
  border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const BrandIcon = styled.span`
  font-size: 20px;
  color: ${p => p.theme.colors.primary};
`;

const BrandName = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: ${p => p.theme.colors.text};
  letter-spacing: -0.02em;
`;

const SidebarNav = styled.nav`
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const NavItem = styled(Link).attrs<{ $active: boolean }>(({ $active }) => ({
  'aria-current': $active ? 'page' : undefined,
}))`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: ${p => (p.$active ? 600 : 400)};
  color: ${p => (p.$active ? p.theme.colors.primary : p.theme.colors.textMuted)};
  background: ${p => (p.$active ? p.theme.colors.background : 'transparent')};
  text-decoration: none;
  transition: background 0.12s, color 0.12s;

  &:hover {
    background: ${p => p.theme.colors.background};
    color: ${p => p.theme.colors.text};
  }

  &[aria-current='page'] {
    border-left: 2px solid ${p => p.theme.colors.primary};
    padding-left: 8px;
  }
`;

const NavIcon = styled.span`
  font-size: 14px;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
`;

const SidebarFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border-top: 1px solid ${p => p.theme.colors.border};
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${p => p.theme.colors.primary};
  color: white;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const UserInfo = styled.div`
  min-width: 0;
`;

const UserName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserRole = styled.div`
  font-size: 11px;
  color: ${p => p.theme.colors.textMuted};
`;

const Content = styled.div`
  flex: 1;
  padding: 24px;
  min-width: 0;
  overflow-x: auto;
`;

const Header = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 16px;
`;

const HeaderLeft = styled.div``;

const PageTitle = styled.h1`
  font-size: 22px;
  font-weight: 700;
  color: ${p => p.theme.colors.text};
  margin: 0 0 4px;
`;

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const BreadcrumbItem = styled.span<{ $current?: boolean }>`
  font-size: 12px;
  color: ${p => (p.$current ? p.theme.colors.textMuted : p.theme.colors.primary)};
`;

const BreadcrumbSep = styled.span`
  font-size: 12px;
  color: ${p => p.theme.colors.border};
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
`;

const HeaderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MetaItem = styled.span`
  font-size: 12px;
  color: ${p => p.theme.colors.textMuted};
`;

const MetaDot = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: ${p => p.theme.colors.border};
`;

const RefreshButton = styled.button`
  background: ${p => p.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.12s;

  &:hover {
    opacity: 0.88;
  }

  &:active {
    opacity: 0.75;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
`;

const statusColors = {
  ok: 'success',
  warning: 'warning',
  critical: 'danger',
  inactive: 'textMuted',
} as const;

const StatCard = styled.div<{ $status: string }>`
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 8px;
  padding: 16px;
  position: relative;
  overflow: hidden;
`;

const StatLabel = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${p => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${p => p.theme.colors.text};
  margin-bottom: 6px;
  letter-spacing: -0.02em;
`;

const StatChange = styled.div<{ $positive: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${p => (p.$positive ? p.theme.colors.success : p.theme.colors.danger)};
`;

const StatIndicator = styled.div<{ $status: string }>`
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  background: ${p => {
    const key = p.$status as keyof typeof statusColors;
    const colorKey = statusColors[key] ?? 'textMuted';
    return p.theme.colors[colorKey as keyof typeof p.theme.colors];
  }};
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 16px;
  align-items: start;
`;

const TableSection = styled.div`
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 8px;
  overflow: hidden;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const SectionTitle = styled.h2`
  font-size: 14px;
  font-weight: 600;
  color: ${p => p.theme.colors.text};
  margin: 0;
`;

const SectionCount = styled.span`
  font-size: 12px;
  color: ${p => p.theme.colors.textMuted};
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const TableRow = styled.tr<{ $clickable?: boolean }>`
  border-bottom: 1px solid ${p => p.theme.colors.border};

  &:last-child {
    border-bottom: none;
  }

  ${p =>
    p.$clickable &&
    css`
      cursor: pointer;
      &:hover td {
        background: ${p.theme.colors.background};
      }
    `}
`;

const TableHead = styled.th`
  padding: 10px 12px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: ${p => p.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: ${p => p.theme.colors.background};
  white-space: nowrap;
`;

const TableCell = styled.td<{ $numeric?: boolean }>`
  padding: 10px 12px;
  color: ${p => p.theme.colors.text};
  white-space: nowrap;
  text-align: ${p => (p.$numeric ? 'right' : 'left')};
  font-variant-numeric: ${p => (p.$numeric ? 'tabular-nums' : 'normal')};
`;

const ServiceName = styled.span`
  font-weight: 500;
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 12px;
`;

const VersionTag = styled.span`
  font-size: 11px;
  font-family: ui-monospace, 'SF Mono', monospace;
  color: ${p => p.theme.colors.textMuted};
  background: ${p => p.theme.colors.background};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 4px;
  padding: 1px 5px;
`;

const rowStatusStyles = {
  healthy: css`
    background: ${(p: any) => p.theme.colors.success}22;
    color: ${(p: any) => p.theme.colors.success};
  `,
  degraded: css`
    background: ${(p: any) => p.theme.colors.warning}22;
    color: ${(p: any) => p.theme.colors.warning};
  `,
  deploying: css`
    background: ${(p: any) => p.theme.colors.accent}22;
    color: ${(p: any) => p.theme.colors.accent};
  `,
  offline: css`
    background: ${(p: any) => p.theme.colors.danger}22;
    color: ${(p: any) => p.theme.colors.danger};
  `,
};

const RowStatusBadge = styled.span<{ $status: string }>`
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  padding: 2px 6px;
  text-transform: capitalize;
  ${p => rowStatusStyles[p.$status as keyof typeof rowStatusStyles] ?? rowStatusStyles.offline}
`;

const ActivitySection = styled.div`
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 8px;
  overflow: hidden;
`;

const ActivityList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const ActivityEntry = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid ${p => p.theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const ActivityAvatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${p => p.theme.colors.secondary};
  color: white;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ActivityBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const ActivityText = styled.div`
  font-size: 13px;
  color: ${p => p.theme.colors.text};
  margin-bottom: 2px;
`;

const ActivityUser = styled.span`
  font-weight: 600;
  color: ${p => p.theme.colors.primary};
`;

const ActivityTime = styled.div`
  font-size: 11px;
  color: ${p => p.theme.colors.textMuted};
`;

const StatusBadge = styled.span.attrs<{ $status: string }>(({ $status }) => ({
  role: 'status',
  'aria-label': $status,
}))`
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  padding: 2px 6px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  align-self: center;
  ${p => {
    switch (p.$status) {
      case 'ok':
        return css`
          background: ${p.theme.colors.success}22;
          color: ${p.theme.colors.success};
        `;
      case 'warning':
        return css`
          background: ${p.theme.colors.warning}22;
          color: ${p.theme.colors.warning};
        `;
      case 'critical':
        return css`
          background: ${p.theme.colors.danger}22;
          color: ${p.theme.colors.danger};
        `;
      default:
        return css`
          background: ${p.theme.colors.border};
          color: ${p.theme.colors.textMuted};
        `;
    }
  }}
`;
