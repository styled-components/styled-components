import Keyframes from '../Keyframes';

describe('Keyframes', () => {
  it('should throw an error when converted to string', () => {
    const keyframes = new Keyframes('foo', 'bar');
    expect(() => keyframes.toString()).toThrowErrorMatchingInlineSnapshot(
      `"It seems you are interpolating a keyframe declaration (foo) into an untagged string. This was supported in styled-components v3, but is not longer supported in v4 as keyframes are now injected on-demand. Please wrap your string in the css\\\`\\\` helper which ensures the styles are injected correctly. See https://www.styled-components.com/docs/api#css"`
    );
  });
});
