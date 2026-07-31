/* global document */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import ConcurrentResponsiveness from './cases/ConcurrentResponsiveness';
import ParentRerender from './cases/ParentRerender';
import SierpinskiTriangle from './cases/SierpinskiTriangle';
import Tree from './cases/Tree';
import impl from './impl';

const implementations = impl;
const packageNames = Object.keys(implementations);

const createTestBlock = (fn, { libraries = packageNames } = {}) => {
  return libraries.reduce((testSetups, packageName) => {
    const impl = implementations[packageName];
    if (!impl) return testSetups;
    const { name, components, version } = impl;
    const { Component, getComponentProps, sampleCount, Provider, benchmarkType, selfTimed } =
      fn(components);

    testSetups[packageName] = {
      Component,
      getComponentProps,
      sampleCount,
      Provider,
      benchmarkType,
      selfTimed,
      version,
      name,
    };
    return testSetups;
  }, {});
};

/** Sync vs buffered injection is a styled-components private A/B only. */
const SC_ONLY = ['styled-components'];

const tests = {
  'Mount deep tree': createTestBlock(components => ({
    benchmarkType: 'mount',
    Component: Tree,
    getComponentProps: ({ cycle }) => ({ breadth: 2, components, depth: 7, id: cycle, wrap: 1 }),
    Provider: components.Provider,
    sampleCount: 500,
  })),
  'Mount wide tree': createTestBlock(components => ({
    benchmarkType: 'mount',
    Component: Tree,
    getComponentProps: ({ cycle }) => ({ breadth: 6, components, depth: 3, id: cycle, wrap: 2 }),
    Provider: components.Provider,
    sampleCount: 500,
  })),
  'Update dynamic styles': createTestBlock(components => ({
    benchmarkType: 'update',
    Component: SierpinskiTriangle,
    getComponentProps: ({ cycle }) => {
      return { components, s: 200, renderCount: cycle, x: 0, y: 0 };
    },
    Provider: components.Provider,
    sampleCount: 1000,
  })),
  'Parent rerender (5000 children)': createTestBlock(components => ({
    benchmarkType: 'update',
    Component: ParentRerender,
    getComponentProps: ({ cycle }) => ({ components, count: cycle, childCount: 5000 }),
    Provider: components.Provider,
    sampleCount: 1000,
  })),
  'Parent rerender (10000 children)': createTestBlock(components => ({
    benchmarkType: 'update',
    Component: ParentRerender,
    getComponentProps: ({ cycle }) => ({ components, count: cycle, childCount: 10000 }),
    Provider: components.Provider,
    sampleCount: 1000,
  })),
  'Concurrent CSS responsiveness': createTestBlock(
    components => ({
      benchmarkType: 'update',
      Component: ConcurrentResponsiveness,
      getComponentProps: () => ({ components }),
      Provider: components.Provider,
      sampleCount: 1,
      selfTimed: true,
    }),
    { libraries: SC_ONLY }
  ),
};

// `?bench=<name>` preselects a benchmark so headless runners can land
// directly on a case without driving the picker.
const requestedBench = new URLSearchParams(window.location.search).get('bench');
if (requestedBench && Object.prototype.hasOwnProperty.call(tests, requestedBench)) {
  try {
    const saved = JSON.parse(localStorage.getItem('sc-bench-settings') || '{}');
    saved.currentBenchmarkName = requestedBench;
    localStorage.setItem('sc-bench-settings', JSON.stringify(saved));
  } catch (e) {
    // storage unavailable; the picker default wins
  }
}

createRoot(document.querySelector('.root')).render(<App tests={tests} />);
