// @flow
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import TestRenderer from 'react-test-renderer';
import { resetStyled } from './utils';
import { makeBrowserTag, makeRehydrationTag } from '../models/StyleTags';
import createGlobalStyle from '../constructors/createGlobalStyle';
import ServerStyleSheet from '../models/ServerStyleSheet';

let styled;

function getAllStyles() {
  return Array.from(document.querySelectorAll('style'));
}

function getAllStyleText() {
  return getAllStyles()
    .map(tag => tag.innerHTML)
    .join('\n');
}

describe('sourceMap', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  describe('makeBrowserTag', () => {});

  describe('styledComponent', () => {
    it('should inject sourceMap', () => {
      const fakeSourceMap = '/* fake source map */';
      const Named1 = styled.div.withConfig({
        sourceMap: fakeSourceMap,
      })``;
      TestRenderer.create(<Named1 />);
      const allStyles = getAllStyleText();
      expect(allStyles.includes(fakeSourceMap)).toBe(true);
    });
  });

  describe('createGlobalStyle', () => {
    it('should inject sourceMap', () => {
      const fakeSourceMap = '/* fake global source map */';
      const MyGlobal = createGlobalStyle.withConfig({
        sourceMap: fakeSourceMap,
      })``;
      TestRenderer.create(<MyGlobal />);
      const allStyles = getAllStyleText();
      expect(allStyles.includes(fakeSourceMap)).toBe(true);
    });

    it('should render to one single style tag when no sourcemap is supplied', () => {
      expect(getAllStyles().length).toBe(0);
      const FirstGlobal = createGlobalStyle`div{color:red}`;

      const SecondGlobal = createGlobalStyle`body{color:red}`;
      TestRenderer.create(
        <React.Fragment>
          <FirstGlobal />
          <SecondGlobal />
        </React.Fragment>
      );
      expect(getAllStyles().length).toBe(1);
    });
    it('should create a new style tag', () => {
      expect(getAllStyles().length).toBe(0);
      const fakeSourceMap = '/* fake global source map */';

      const FirstGlobal = createGlobalStyle`div{color:red}`;

      const SecondGlobal = createGlobalStyle.withConfig({
        sourceMap: fakeSourceMap,
      })`body{color:red}`;

      TestRenderer.create(
        <React.Fragment>
          <FirstGlobal />
          <SecondGlobal />
        </React.Fragment>
      );

      const [firstGlobalStyleTag, secondGlobalStyleTag] = getAllStyles();
      expect(secondGlobalStyleTag.innerHTML.includes(fakeSourceMap)).toBe(true);
      expect(secondGlobalStyleTag.innerHTML.includes('body{color:red}'));
    });

    it('should create new style tag when injecting after a sourceMap tag', () => {
      const fakeSourceMap = '/* fake global source map */';
      const FirstGlobal = createGlobalStyle.withConfig({
        sourceMap: fakeSourceMap,
      })`div{color:red}`;
      const SecondGlobal = createGlobalStyle`body{color:red}`;
      TestRenderer.create(
        <React.Fragment>
          <FirstGlobal />
          <SecondGlobal />
        </React.Fragment>
      );
      expect(getAllStyles().length).toBe(2);
    });

    it('should support renderToString', () => {
      const sheet = new ServerStyleSheet();
      const fakeSourceMap = '/* fake global source map */';

      const FirstGlobal = createGlobalStyle`div {color: red}`;

      const SecondGlobal = createGlobalStyle.withConfig({
        sourceMap: fakeSourceMap,
      })`body { color: red }`;

      ReactDOMServer.renderToString(
        sheet.collectStyles(
          <React.Fragment>
            <FirstGlobal />
            <SecondGlobal />
          </React.Fragment>
        )
      );

      const container = document.createElement('div');
      container.innerHTML = sheet.getStyleTags();

      const [firstGlobalStyleTag, secondGlobalStyleTag] = container.querySelectorAll('style');
      expect(secondGlobalStyleTag.innerHTML.includes(fakeSourceMap)).toBe(true);
      expect(secondGlobalStyleTag.innerHTML.includes('body { color: red }'));
    });
  });
});
