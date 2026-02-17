declare const myTheme: {
    colors: {
        primary: string;
        secondary: string;
    };
    fontSize: {
        small: string;
        medium: string;
    };
};
export type ThemeInterface = typeof myTheme;
export {};
