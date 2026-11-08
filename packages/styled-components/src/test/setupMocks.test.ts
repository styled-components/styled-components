jest.mock('../parser/emit-web', () => ({
  ...jest.requireActual('../parser/emit-web'),
  emitWeb: () => ['mocked emit'],
}));

import createCompiler from '../utils/compiler';

/**
 * The shared setup file runs before each test file's module mocks. A library module it loads at
 * import time would keep the real modules, so a suite mocking `isRsc` would never see the mock in
 * the parser and emitter.
 */
it("applies a test file's module mock to the modules the shared setup file uses", () => {
  expect(createCompiler().compile('a{color:red}')).toEqual(['mocked emit']);
});
