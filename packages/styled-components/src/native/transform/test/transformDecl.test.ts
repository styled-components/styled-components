import { transformDecl } from '../index';

describe('transformDecl — pass-through + coercion (skeleton)', () => {
  it('passes through transform as a CSS string (RN parses natively)', () => {
    expect(transformDecl('transform', 'rotate(45deg) scale(1.2)')).toEqual({
      transform: 'rotate(45deg) scale(1.2)',
    });
  });

  it('passes through boxShadow', () => {
    expect(transformDecl('boxShadow', '0 2px 4px rgba(0,0,0,.2)')).toEqual({
      boxShadow: '0 2px 4px rgba(0,0,0,.2)',
    });
  });

  it('passes through filter chains', () => {
    expect(transformDecl('filter', 'blur(4px) saturate(1.5)')).toEqual({
      filter: 'blur(4px) saturate(1.5)',
    });
  });

  it('passes through backgroundImage gradients', () => {
    expect(transformDecl('backgroundImage', 'linear-gradient(to right, red, blue)')).toEqual({
      backgroundImage: 'linear-gradient(to right, red, blue)',
    });
  });

  it('passes through modern colors via backgroundColor', () => {
    expect(transformDecl('backgroundColor', 'rgb(255 128 0 / 0.5)')).toEqual({
      backgroundColor: 'rgb(255 128 0 / 0.5)',
    });
    expect(transformDecl('backgroundColor', 'hwb(120 10% 20%)')).toEqual({
      backgroundColor: 'hwb(120 10% 20%)',
    });
  });

  it('coerces simple length values to dp numbers', () => {
    expect(transformDecl('width', '100px')).toEqual({ width: 100 });
    expect(transformDecl('width', '0')).toEqual({ width: 0 });
  });

  it('keeps percentage as string', () => {
    expect(transformDecl('width', '50%')).toEqual({ width: '50%' });
  });

  it('keeps auto as string', () => {
    expect(transformDecl('width', 'auto')).toEqual({ width: 'auto' });
  });

  it('coerces unitless numeric props to Number', () => {
    expect(transformDecl('opacity', '0.5')).toEqual({ opacity: 0.5 });
    expect(transformDecl('flexGrow', '1')).toEqual({ flexGrow: 1 });
    expect(transformDecl('zIndex', '10')).toEqual({ zIndex: 10 });
  });

  it('passes color names through', () => {
    expect(transformDecl('color', 'red')).toEqual({ color: 'red' });
    expect(transformDecl('color', '#fff')).toEqual({ color: '#fff' });
    expect(transformDecl('color', 'currentColor')).toEqual({ color: 'currentColor' });
  });
});
