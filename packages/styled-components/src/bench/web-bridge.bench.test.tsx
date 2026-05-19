/**
 * Bridge vs. current path microbench. Measures end-to-end React render
 * cost for a grid of bridged primitives against the same grid rendered
 * through `styled-components/native` (the rn-web variant of today's
 * native path that hands an RN style object to react-native-web for
 * re-atomization).
 *
 * Numbers from 2026-05-18 (V8, jsdom, NODE_ENV=production, 4 runs each):
 *   static-CSS grid (1 decl/cell, 200 cells)   : -12% to +3%   (slight bridge edge)
 *   heavier-CSS grid (8 decls/cell, 200 cells) : -8% to +21%   (high MAD, no signal)
 *
 * React reconciliation dominates the workload; the CSS-pipeline delta
 * lives below the noise floor of an end-to-end render bench. The
 * bridge's value is bundle savings and a single CSS pipeline on
 * rn-web, not raw render-time wins. The bench here is a guardrail
 * (bridge stays competitive within order-of-magnitude), not the
 * justification.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

import styledBridge from '../native/web-bridge';
import { compareBench } from './bench-utils';

// __NATIVE_WEB__ must be true so the rn-web-bound import of
// `styled-components/native` resolves the rn-web branch. Setting at
// the top of the file because the native entry runs side-effecting
// modules at import time.
(globalThis as { __NATIVE_WEB__?: boolean }).__NATIVE_WEB__ = true;
// styled-components/native imports react-native; for rn-web parity in
// this bench we route the import to react-native-web (matches what the
// native package's `browser` field does at consumer build time).
jest.mock('react-native', () => require('react-native-web'));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const styledNativeMod = require('../native') as typeof import('../native');
const styledNative = styledNativeMod.default;

const GRID_SIZE = 200;

const BridgedBox = styledBridge.View`
  background-color: rgb(40, 80, 120);
  padding: 8px;
`;

const NativeBox = styledNative.View`
  background-color: rgb(40, 80, 120);
  padding: 8px;
`;

function GridBridge(): React.ReactElement {
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    cells.push(<BridgedBox key={i} />);
  }
  return <>{cells}</>;
}

function GridNative(): React.ReactElement {
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    cells.push(<NativeBox key={i} />);
  }
  return <>{cells}</>;
}

// Render helper that mounts a fresh root per iteration so we measure
// cold-render cost rather than amortized re-render. Unmount cost shows
// up in both arms equally so it doesn't bias the ratio.
function renderArm(Component: React.ComponentType): () => void {
  return () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    root.render(<Component />);
    root.unmount();
    host.remove();
  };
}

describe('rn-web bridge vs. current path', () => {
  it('compares cold-mount cost for a static-CSS grid', () => {
    compareBench(
      `mount ${GRID_SIZE} static cells`,
      30,
      { name: 'native (today)', fn: renderArm(GridNative) },
      { name: 'web-bridge', fn: renderArm(GridBridge) },
      { runs: 5, warmupMax: 5 }
    );
  });

  it('compares cold-mount cost for a heavier-CSS grid', () => {
    // More declarations per cell so the CSS pipeline is a larger
    // fraction of total mount cost. React reconciliation cost stays the
    // same in both arms; difference reflects the pipeline overhead.
    const HeavyBridged = styledBridge.View`
      background-color: rgb(30, 60, 90);
      padding: 8px 12px;
      margin: 4px;
      border-radius: 4px;
      border: 1px solid rgb(200, 200, 200);
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    `;
    const HeavyNative = styledNative.View`
      background-color: rgb(30, 60, 90);
      padding: 8px 12px;
      margin: 4px;
      border-radius: 4px;
      border: 1px solid rgb(200, 200, 200);
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    `;
    function HeavyGridBridge(): React.ReactElement {
      const cells: React.ReactNode[] = [];
      for (let i = 0; i < GRID_SIZE; i++) cells.push(<HeavyBridged key={i} />);
      return <>{cells}</>;
    }
    function HeavyGridNative(): React.ReactElement {
      const cells: React.ReactNode[] = [];
      for (let i = 0; i < GRID_SIZE; i++) cells.push(<HeavyNative key={i} />);
      return <>{cells}</>;
    }
    compareBench(
      `mount ${GRID_SIZE} heavy cells`,
      20,
      { name: 'native (today)', fn: renderArm(HeavyGridNative) },
      { name: 'web-bridge', fn: renderArm(HeavyGridBridge) },
      { runs: 5, warmupMax: 5 }
    );
  });
});
