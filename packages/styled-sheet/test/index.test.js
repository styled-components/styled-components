import StyleSheet, { DOMStyleSheet } from '../src';

it('should insert styles', () => {
  const sheet = new DOMStyleSheet();
  const styleSheet = new StyleSheet(sheet);
  styleSheet.insertRules(['.bla { color: red; }'], 0);
  styleSheet.insertRules(['.bla { color: red; }'], 0);
  styleSheet.insertRules(['.bla2 { color: red; }'], 0);
  styleSheet.insertRules(['.bla2 { color: red; }'], 0);
  expect(sheet.tag.sheet.cssRules).toMatchSnapshot();
});
