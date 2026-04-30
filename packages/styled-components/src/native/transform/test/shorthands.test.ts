import { transformDecl } from '../index';

describe('margin / padding / border-* directional shorthands', () => {
  it('margin: single value → bare scalar (RN accepts `margin: N`)', () => {
    expect(transformDecl('margin', '10px')).toEqual({ margin: 10 });
  });

  it('margin: 2 values → vertical / horizontal', () => {
    expect(transformDecl('margin', '10px 20px')).toEqual({
      marginTop: 10,
      marginRight: 20,
      marginBottom: 10,
      marginLeft: 20,
    });
  });

  it('margin: 3 values → top / h / bottom', () => {
    expect(transformDecl('margin', '10px 20px 30px')).toEqual({
      marginTop: 10,
      marginRight: 20,
      marginBottom: 30,
      marginLeft: 20,
    });
  });

  it('margin: 4 values → trbl', () => {
    expect(transformDecl('margin', '10px 20px 30px 40px')).toEqual({
      marginTop: 10,
      marginRight: 20,
      marginBottom: 30,
      marginLeft: 40,
    });
  });

  it('margin: auto and 0 mix', () => {
    expect(transformDecl('margin', '0 auto')).toEqual({
      marginTop: 0,
      marginRight: 'auto',
      marginBottom: 0,
      marginLeft: 'auto',
    });
  });

  it('padding: accepts percent', () => {
    expect(transformDecl('padding', '5% 10%')).toEqual({
      paddingTop: '5%',
      paddingRight: '10%',
      paddingBottom: '5%',
      paddingLeft: '10%',
    });
  });

  it('padding: 4 env() values pass through to the resolver', () => {
    expect(
      transformDecl(
        'padding',
        'env(safe-area-inset-top, 12px) env(safe-area-inset-right, 16px) env(safe-area-inset-bottom, 12px) env(safe-area-inset-left, 16px)'
      )
    ).toEqual({
      paddingTop: 'env(safe-area-inset-top, 12px)',
      paddingRight: 'env(safe-area-inset-right, 16px)',
      paddingBottom: 'env(safe-area-inset-bottom, 12px)',
      paddingLeft: 'env(safe-area-inset-left, 16px)',
    });
  });

  it('margin: theme sentinel passes through (resolved at render time)', () => {
    expect(transformDecl('margin', '\0sc:space.md:16px')).toEqual({
      margin: '\0sc:space.md:16px',
    });
  });

  it('padding: math-fn arms pass through to the resolver', () => {
    expect(
      transformDecl(
        'padding',
        'calc(\0sc:space.md:16px + 4px) min(20px, 5vw) 8px max(\0sc:space.lg:24px, 16px)'
      )
    ).toEqual({
      paddingTop: 'calc(\0sc:space.md:16px + 4px)',
      paddingRight: 'min(20px, 5vw)',
      paddingBottom: 8,
      paddingLeft: 'max(\0sc:space.lg:24px, 16px)',
    });
  });

  it('margin: clamp() with theme sentinel arm survives shorthand expansion', () => {
    expect(transformDecl('margin', 'clamp(8px, \0sc:space.md:16px, 32px)')).toEqual({
      margin: 'clamp(8px, \0sc:space.md:16px, 32px)',
    });
  });

  it('borderWidth: 4 values → per-side', () => {
    expect(transformDecl('borderWidth', '1px 2px 3px 4px')).toEqual({
      borderTopWidth: 1,
      borderRightWidth: 2,
      borderBottomWidth: 3,
      borderLeftWidth: 4,
    });
  });

  it('borderRadius: 4 corners', () => {
    expect(transformDecl('borderRadius', '4px 8px 12px 16px')).toEqual({
      borderTopLeftRadius: 4,
      borderTopRightRadius: 8,
      borderBottomRightRadius: 12,
      borderBottomLeftRadius: 16,
    });
  });

  it('borderColor: 4 sides', () => {
    expect(transformDecl('borderColor', 'red green blue yellow')).toEqual({
      borderTopColor: 'red',
      borderRightColor: 'green',
      borderBottomColor: 'blue',
      borderLeftColor: 'yellow',
    });
  });

  it('borderColor: hex (single value → bare scalar)', () => {
    expect(transformDecl('borderColor', '#333')).toEqual({ borderColor: '#333' });
  });
});

describe('border composite shorthand', () => {
  it('width + style + color', () => {
    expect(transformDecl('border', '1px solid red')).toEqual({
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'red',
    });
  });

  it('order-agnostic', () => {
    expect(transformDecl('border', 'red solid 2px')).toEqual({
      borderWidth: 2,
      borderStyle: 'solid',
      borderColor: 'red',
    });
  });

  it('border: none fixes CSSTN quirk — now emits borderStyle: none (not solid)', () => {
    expect(transformDecl('border', 'none')).toEqual({
      borderWidth: 0,
      borderStyle: 'none',
      borderColor: 'transparent',
    });
  });

  it('defaults: missing width/style/color', () => {
    expect(transformDecl('border', 'dotted')).toEqual({
      borderWidth: 1,
      borderStyle: 'dotted',
      borderColor: 'black',
    });
  });

  it('width + style + theme sentinel color (resolved at render time)', () => {
    expect(transformDecl('border', '1px solid \0sc:colors.border:#e3e3e8')).toEqual({
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: '\0sc:colors.border:#e3e3e8',
    });
  });
});

describe('flex / flex-flow / place-content', () => {
  it('flex: none short-circuit', () => {
    expect(transformDecl('flex', 'none')).toEqual({
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 'auto',
    });
  });

  it('flex: auto short-circuit', () => {
    expect(transformDecl('flex', 'auto')).toEqual({
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 'auto',
    });
  });

  it('flex: 1', () => {
    expect(transformDecl('flex', '1')).toEqual({
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
    });
  });

  it('flex: 1 0 auto', () => {
    expect(transformDecl('flex', '1 0 auto')).toEqual({
      flexGrow: 1,
      flexShrink: 0,
      flexBasis: 'auto',
    });
  });

  it('flex: 2 0 100px', () => {
    expect(transformDecl('flex', '2 0 100px')).toEqual({
      flexGrow: 2,
      flexShrink: 0,
      flexBasis: 100,
    });
  });

  it('flex-flow: row wrap', () => {
    expect(transformDecl('flexFlow', 'row wrap')).toEqual({
      flexDirection: 'row',
      flexWrap: 'wrap',
    });
  });

  it('flex-flow: order agnostic', () => {
    expect(transformDecl('flexFlow', 'wrap column')).toEqual({
      flexDirection: 'column',
      flexWrap: 'wrap',
    });
  });

  it('place-content: single value → justify defaults to stretch', () => {
    expect(transformDecl('placeContent', 'center')).toEqual({
      alignContent: 'center',
      justifyContent: 'stretch',
    });
  });

  it('place-content: two values', () => {
    expect(transformDecl('placeContent', 'flex-start space-between')).toEqual({
      alignContent: 'flex-start',
      justifyContent: 'space-between',
    });
  });
});

describe('font / fontFamily / fontVariant / aspectRatio', () => {
  it('font: full composite', () => {
    expect(transformDecl('font', 'italic bold 14px/1.5 Helvetica')).toEqual({
      fontStyle: 'italic',
      fontWeight: 'bold',
      fontVariant: [],
      fontSize: 14,
      lineHeight: 1.5,
      fontFamily: 'Helvetica',
    });
  });

  it('font: minimum required (size + family)', () => {
    expect(transformDecl('font', '16px Arial')).toEqual({
      fontStyle: 'normal',
      fontWeight: 'normal',
      fontVariant: [],
      fontSize: 16,
      fontFamily: 'Arial',
    });
  });

  it('font: weight as numeric', () => {
    expect(transformDecl('font', '700 14px sans-serif')).toEqual({
      fontStyle: 'normal',
      fontWeight: 700,
      fontVariant: [],
      fontSize: 14,
      fontFamily: 'sans-serif',
    });
  });

  it('font-family: multi-word unquoted', () => {
    expect(transformDecl('fontFamily', 'Helvetica Neue')).toEqual({
      fontFamily: 'Helvetica Neue',
    });
  });

  it('font-family: quoted string', () => {
    expect(transformDecl('fontFamily', '"Helvetica Neue"')).toEqual({
      fontFamily: 'Helvetica Neue',
    });
  });

  it('font-variant: array of idents', () => {
    expect(transformDecl('fontVariant', 'small-caps tabular-nums')).toEqual({
      fontVariant: ['small-caps', 'tabular-nums'],
    });
  });

  it('aspect-ratio: number', () => {
    expect(transformDecl('aspectRatio', '1.5')).toEqual({ aspectRatio: 1.5 });
  });

  it('aspect-ratio: slash form', () => {
    expect(transformDecl('aspectRatio', '16 / 9')).toEqual({ aspectRatio: 16 / 9 });
  });
});

describe('text-decoration / text-shadow', () => {
  it('text-decoration: single line', () => {
    expect(transformDecl('textDecoration', 'underline')).toEqual({
      textDecorationLine: 'underline',
      textDecorationStyle: 'solid',
      textDecorationColor: 'black',
    });
  });

  it('text-decoration: dual-line sorted canonically', () => {
    expect(transformDecl('textDecoration', 'line-through underline').textDecorationLine).toBe(
      'underline line-through'
    );
  });

  it('text-decoration: full composite', () => {
    expect(transformDecl('textDecoration', 'underline dashed red')).toEqual({
      textDecorationLine: 'underline',
      textDecorationStyle: 'dashed',
      textDecorationColor: 'red',
    });
  });

  it('text-decoration-line: single', () => {
    expect(transformDecl('textDecorationLine', 'line-through')).toEqual({
      textDecorationLine: 'line-through',
    });
  });

  it('text-shadow: simple', () => {
    expect(transformDecl('textShadow', '2px 4px 6px red')).toEqual({
      textShadowOffset: { width: 2, height: 4 },
      textShadowRadius: 6,
      textShadowColor: 'red',
    });
  });

  it('text-shadow: none', () => {
    expect(transformDecl('textShadow', 'none')).toEqual({
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 0,
      textShadowColor: 'black',
    });
  });

  it('shadow-offset: width only (reuses x for y)', () => {
    expect(transformDecl('shadowOffset', '3px')).toEqual({
      shadowOffset: { width: 3, height: 3 },
    });
  });

  it('shadow-offset: x and y', () => {
    expect(transformDecl('shadowOffset', '3px 5px')).toEqual({
      shadowOffset: { width: 3, height: 5 },
    });
  });
});

describe('bug fixes from CSSTN', () => {
  it('border: none emits borderStyle: none (not solid)', () => {
    const r = transformDecl('border', 'none') as any;
    expect(r.borderStyle).toBe('none');
  });

  it('transform: matrix() is now supported (pass-through)', () => {
    expect(transformDecl('transform', 'matrix(1, 0, 0, 1, 40, 40)')).toEqual({
      transform: 'matrix(1, 0, 0, 1, 40, 40)',
    });
  });

  it('transform: bare number translateX is now accepted (pass-through)', () => {
    expect(transformDecl('transform', 'translateX(10)')).toEqual({
      transform: 'translateX(10)',
    });
  });

  it('boxShadow: passes through (RN parses natively)', () => {
    expect(transformDecl('boxShadow', '0 2px 4px rgba(0,0,0,.2)')).toEqual({
      boxShadow: '0 2px 4px rgba(0,0,0,.2)',
    });
  });

  it('filter: blur+saturate passes through', () => {
    expect(transformDecl('filter', 'blur(4px) saturate(1.5)')).toEqual({
      filter: 'blur(4px) saturate(1.5)',
    });
  });

  it('backgroundImage: gradient passes through (renamed to RN experimental_)', () => {
    expect(transformDecl('backgroundImage', 'linear-gradient(90deg, red, blue)')).toEqual({
      experimental_backgroundImage: 'linear-gradient(90deg, red, blue)',
    });
  });
});
