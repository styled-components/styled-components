declare global {
  interface Window {
    '__styled-components-init__'?: number;
  }
}

declare module '@emotion/unitless' {
  export default {} as { [key: string]: boolean };
}
