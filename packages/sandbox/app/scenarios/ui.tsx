import type { ReactNode } from 'react';

/** Computed colors the scenario probes expect; `data-expected` on a probe holds one of these. */
export const RED = 'rgb(255, 0, 0)';
export const BLUE = 'rgb(0, 0, 255)';
export const GREEN = 'rgb(0, 128, 0)';
export const PURPLE = 'rgb(128, 0, 128)';

/** Late Suspense boundaries wait this long so the shell flushes first. */
export const LATE_MS = 1200;

export function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

type ScenarioProps = {
  children: ReactNode;
  expected: string;
  rows: string;
  title: string;
};

/**
 * Page chrome for a style-order scenario. It uses inline styles on purpose: the library must
 * hold only the scenario's own components, so measurements read the scenario and nothing else.
 */
export function Scenario({ children, expected, rows, title }: ScenarioProps) {
  return (
    <section
      data-scenario={rows}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}
    >
      <h1 style={{ fontSize: 20, margin: 0 }}>{title}</h1>
      <p style={{ fontSize: 14, margin: 0 }}>
        Plan rows: {rows}. Expected: {expected}. Each element with <code>data-expected</code> must
        compute to that value.
      </p>
      {children}
    </section>
  );
}
