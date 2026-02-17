declare var __SERVER__: boolean;
declare var __VERSION__: string;
declare var __IS_RSC__: boolean;

global.__SERVER__ = typeof document === 'undefined';
global.__VERSION__ = 'JEST_MOCK_VERSION';
global.__IS_RSC__ = false;
