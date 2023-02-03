declare var __SERVER__: boolean;
declare var __VERSION__: string;

global.__SERVER__ = typeof document === 'undefined';
global.__VERSION__ = 'JEST_MOCK_VERSION';
