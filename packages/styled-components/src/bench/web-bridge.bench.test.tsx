/**
 * Bridge vs. current path microbench. Measures end-to-end React render
 * cost for a grid of bridged primitives against the same grid rendered
 * through `styled-components/native` (the rn-web variant of today's
 * native path that hands an RN style object to react-native-web for
 * re-atomization). Every mount runs inside `flushSync`, so each row
 * times a committed render. The bench is a guardrail (the bridge stays
 * competitive with today's path), not a justification for the bridge.
 */

import React from 'react';
import { flushSync } from 'react-dom';
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

const styledNativeMod = require('../native') as typeof import('../native');
const styledNative = styledNativeMod.default;

const GRID_SIZE = 200;
const FRESH_COMPONENTS = 50;

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
    // Without `flushSync` the render is only scheduled, and unmount cancels it before it runs.
    flushSync(() => root.render(<Component />));
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

  it('compares cold-mount cost for a grid of Pressables with :disabled', () => {
    const DisabledBridged = styledBridge.Pressable`
      padding: 8px;
      &:disabled {
        opacity: 0.4;
      }
    `;
    const DisabledNative = styledNative.Pressable`
      padding: 8px;
      &:disabled {
        opacity: 0.4;
      }
    `;
    function DisabledGridBridge(): React.ReactElement {
      const cells: React.ReactNode[] = [];
      for (let i = 0; i < GRID_SIZE; i++)
        cells.push(<DisabledBridged key={i} disabled={i % 2 === 0} />);
      return <>{cells}</>;
    }
    function DisabledGridNative(): React.ReactElement {
      const cells: React.ReactNode[] = [];
      for (let i = 0; i < GRID_SIZE; i++)
        cells.push(<DisabledNative key={i} disabled={i % 2 === 0} />);
      return <>{cells}</>;
    }
    compareBench(
      `mount ${GRID_SIZE} Pressables with :disabled`,
      20,
      { name: 'native (today)', fn: renderArm(DisabledGridNative) },
      { name: 'web-bridge', fn: renderArm(DisabledGridBridge) },
      { runs: 5, warmupMax: 5 }
    );
  });

  // Each iteration defines its components anew and mounts them inside `flushSync`, so every rule
  // compiles each time and the selector scanners run per component, not once per process.
  type Template = (styled: typeof styledBridge) => React.ComponentType<{ disabled?: boolean }>;

  function defineAndMount(
    styled: typeof styledBridge | typeof styledNative,
    template: Template,
    alternateDisabled: boolean
  ): () => void {
    return () => {
      const cells: React.ReactNode[] = [];
      for (let i = 0; i < FRESH_COMPONENTS; i++) {
        const Cell = template(styled as typeof styledBridge);
        cells.push(<Cell key={i} disabled={alternateDisabled ? i % 2 === 0 : undefined} />);
      }

      const host = document.createElement('div');
      document.body.appendChild(host);
      const root = createRoot(host);
      flushSync(() => root.render(<>{cells}</>));
      root.unmount();
      host.remove();
    };
  }

  /** Runs one template through both pipelines, defining and mounting it per iteration. */
  function compareDefine(
    title: string,
    template: Template,
    { alternateDisabled = false } = {}
  ): void {
    compareBench(
      `define and mount ${FRESH_COMPONENTS} components with ${title}`,
      20,
      { name: 'native (today)', fn: defineAndMount(styledNative, template, alternateDisabled) },
      { name: 'web-bridge', fn: defineAndMount(styledBridge, template, alternateDisabled) },
      { runs: 5, warmupMax: 5 }
    );
  }

  it('compares defining and mounting components with :not chains', () => {
    compareDefine(
      ':not chains',
      s => s.View`
        padding: 8px;
        &:not([data-tone='pass']):not([data-tone='fail']) {
          opacity: 0.8;
        }
        &:not([data-a]):not([data-b]):not([data-c]) {
          margin: 2px;
        }
      `
    );
  });

  it('compares defining and mounting components with no :not', () => {
    compareDefine(
      'no :not',
      s => s.View`
        padding: 8px;
        &:hover {
          opacity: 0.8;
        }
        & .child {
          margin: 2px;
        }
      `
    );
  });

  it('compares defining and mounting components with :not in selector lists and at-rules', () => {
    compareDefine(
      ':not in lists and at-rules',
      s => s.View`
        padding: 8px;
        &:hover,
        &:not([data-a]):not([data-b]),
        & .child {
          opacity: 0.8;
        }
        @media (min-width: 100px) {
          &:not([data-c]) {
            margin: 2px;
          }
        }
      `
    );
  });

  it('compares defining and mounting components with :disabled and :enabled heads', () => {
    compareDefine(
      ':disabled and :enabled',
      s => s.Pressable`
        padding: 8px;
        &:disabled {
          opacity: 0.4;
        }
        &:enabled {
          opacity: 0.9;
        }
      `,
      { alternateDisabled: true }
    );
  });

  it('compares defining and mounting components with vertical-align in a state and an at-rule', () => {
    compareDefine(
      'vertical-align',
      s => s.Text`
        padding: 8px;
        @media (min-width: 1px) {
          &:hover {
            vertical-align: top;
          }
        }
      `
    );
  });
});
