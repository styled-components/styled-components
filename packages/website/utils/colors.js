import lighten from 'polished/lib/color/lighten'
import darken from 'polished/lib/color/darken'
import shade from 'polished/lib/color/shade'

export const lightGrey = 'rgba(20, 20, 20, 0.1)'
export const darkGrey = darken(0.05, '#282a36')
export const grey = '#282a36'

export const red = '#ff5555'
export const violetRed = 'rgb(219, 112, 147)'
export const lightVioletRed = lighten(0.27, 'rgb(219, 112, 147)')

export const gold = shade(0.9, 'rgb(243, 182, 97)')

