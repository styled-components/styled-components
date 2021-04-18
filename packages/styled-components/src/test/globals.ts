/* eslint-disable no-underscore-dangle */
global.__SERVER__ = typeof document === 'undefined';
global.__VERSION__ = 'JEST_MOCK_VERSION';

declare let __SERVER__: boolean;
declare let __VERSION__: string;
