declare var __SERVER__: boolean;
declare var __VERSION__: string;

/* eslint-disable no-underscore-dangle */
global.__SERVER__ = typeof document === 'undefined';
global.__VERSION__ = 'JEST_MOCK_VERSION';
