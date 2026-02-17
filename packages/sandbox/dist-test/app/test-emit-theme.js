export function getThemeColor(theme) {
    return theme.colors.primary;
}
export function makeTheme() {
    return {
        colors: { primary: '#fff', secondary: '#000', text: '#333', background: '#fff' },
        spacing: { small: '4px', medium: '8px', large: '16px' },
        typography: {
            fontFamily: 'sans-serif',
            fontSize: { small: '12px', medium: '14px', large: '18px' },
        },
    };
}
