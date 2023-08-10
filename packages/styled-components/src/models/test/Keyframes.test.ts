import Keyframes from '../Keyframes';

describe('Keyframes', () => {
  it('should throw an error when converted to string', () => {
    const keyframes = new Keyframes('foo', 'bar');
    expect(() => keyframes.toString()).toThrowError(
      /It seems you are interpolating a keyframe declaration \(foo\) into an untagged string./
    );
  });
});
