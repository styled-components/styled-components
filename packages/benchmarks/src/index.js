/* global document */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import ParentRerender from './cases/ParentRerender';
import SierpinskiTriangle from './cases/SierpinskiTriangle';
import Tree from './cases/Tree';
import impl from './impl';

const implementations = impl;
const packageNames = Object.keys(implementations);

const createTestBlock = fn => {
  return packageNames.reduce((testSetups, packageName) => {
    const { name, components, version } = implementations[packageName];
    const { Component, getComponentProps, sampleCount, Provider, benchmarkType } = fn(components);

    testSetups[packageName] = {
      Component,
      getComponentProps,
      sampleCount,
      Provider,
      benchmarkType,
      version,
      name,
    };
    return testSetups;
  }, {});
};

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
};

createRoot(document.querySelector('.root')).render(<App tests={tests} />);
