export type CellStatus = 'ok' | 'warning' | 'critical' | 'inactive';
export type Priority = 'low' | 'medium' | 'high';

export interface GridCellData {
  id: string;
  value: number;
  status: CellStatus;
  priority: Priority;
  intensity: number;
}

const statuses: CellStatus[] = ['ok', 'warning', 'critical', 'inactive'];
const priorities: Priority[] = ['low', 'medium', 'high'];

// Seeded PRNG (mulberry32) for deterministic initial data across SSR and client.
// Math.random() differs between server and client evaluation, causing hydration mismatches.
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFrom<T>(arr: readonly T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

export function randomCell(id: string, rand = Math.random): GridCellData {
  return {
    id,
    value: Math.floor(rand() * 1000),
    status: pickFrom(statuses, rand),
    priority: pickFrom(priorities, rand),
    intensity: rand(),
  };
}

export function generateGrid(rows: number, cols: number, seed?: number): GridCellData[][] {
  const rand = seed !== undefined ? mulberry32(seed) : Math.random;
  const grid: GridCellData[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: GridCellData[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(randomCell(`cell-${r}-${c}`, rand));
    }
    grid.push(row);
  }
  return grid;
}

export function generateCells(count: number, seed?: number): GridCellData[] {
  const rand = seed !== undefined ? mulberry32(seed) : Math.random;
  const cells: GridCellData[] = [];
  for (let i = 0; i < count; i++) {
    cells.push(randomCell(`cell-${i}`, rand));
  }
  return cells;
}

export interface DashboardStat {
  id: string;
  label: string;
  value: number;
  change: number;
  status: CellStatus;
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  status: CellStatus;
}

const userNames = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Hank'];
const actions = [
  'deployed',
  'reviewed',
  'merged',
  'commented',
  'opened',
  'closed',
  'approved',
  'rejected',
];
const statLabels = [
  'Revenue',
  'Users',
  'Latency',
  'Errors',
  'Throughput',
  'Uptime',
  'CPU',
  'Memory',
];

export function generateStats(count: number, seed?: number): DashboardStat[] {
  const rand = seed !== undefined ? mulberry32(seed) : Math.random;
  const stats: DashboardStat[] = [];
  for (let i = 0; i < count; i++) {
    stats.push({
      id: `stat-${i}`,
      label: statLabels[i % statLabels.length],
      value: Math.floor(rand() * 10000),
      change: (rand() - 0.5) * 20,
      status: pickFrom(statuses, rand),
    });
  }
  return stats;
}

export function generateActivity(count: number, seed?: number): ActivityItem[] {
  const rand = seed !== undefined ? mulberry32(seed) : Math.random;
  const items: ActivityItem[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: `activity-${i}`,
      user: pickFrom(userNames, rand),
      action: pickFrom(actions, rand),
      timestamp: new Date(1743724800000 - Math.floor(rand() * 86400000)).toISOString(),
      status: pickFrom(statuses, rand),
    });
  }
  return items;
}

export interface FormFieldData {
  id: string;
  label: string;
  value: string;
  hasError: boolean;
  errorMessage: string;
}

const fieldLabels = [
  'Name',
  'Email',
  'Phone',
  'Address',
  'City',
  'State',
  'Zip',
  'Company',
  'Title',
  'Department',
  'Manager',
  'Start Date',
  'SSN',
  'Account',
  'Routing',
  'Notes',
  'Emergency Contact',
  'Alt Phone',
  'Website',
  'LinkedIn',
  'GitHub',
  'Slack',
  'Office',
  'Floor',
  'Badge ID',
  'Parking',
  'Shirt Size',
  'Dietary',
  'Timezone',
  'Language',
];

export function generateFormFields(count: number): FormFieldData[] {
  const fields: FormFieldData[] = [];
  for (let i = 0; i < count; i++) {
    fields.push({
      id: `field-${i}`,
      label: fieldLabels[i % fieldLabels.length],
      value: '',
      hasError: false,
      errorMessage: 'This field is required',
    });
  }
  return fields;
}

export interface ListItemData {
  id: string;
  title: string;
  preview: string;
  sender: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  priority: Priority;
}

const subjects = [
  'Q4 Budget Review',
  'Deploy v2.3.1',
  'New hire onboarding',
  'Sprint retrospective',
  'API rate limit increase',
  'Customer escalation',
  'Security audit findings',
  'Performance regression',
  'Design review feedback',
  'Infrastructure migration',
  'Dependency update',
  'CI pipeline failure',
  'Staging env down',
  'Release notes draft',
  'Team lunch Friday',
  'PTO request',
  'Conference talk proposal',
  'Vendor evaluation',
  'Accessibility audit',
  'Mobile app crash report',
  'Database backup alert',
  'SSL cert renewal',
  'Feature flag cleanup',
  'Monitoring dashboard update',
  'Load test results',
  'Code review guidelines',
  'Incident postmortem',
  'Quarterly goals update',
  'New office policy',
  'Holiday schedule',
];

export function generateListItems(count: number, seed?: number): ListItemData[] {
  const rand = seed !== undefined ? mulberry32(seed) : Math.random;
  const items: ListItemData[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: `item-${i}`,
      title: subjects[i % subjects.length],
      preview: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.',
      sender: pickFrom(userNames, rand),
      timestamp: new Date(1743724800000 - Math.floor(rand() * 604800000)).toISOString(),
      isRead: rand() > 0.4,
      isStarred: rand() > 0.8,
      priority: pickFrom(priorities, rand),
    });
  }
  return items;
}
