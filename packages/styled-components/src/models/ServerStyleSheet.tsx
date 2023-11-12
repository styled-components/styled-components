import React from 'react';
import type * as streamInternal from 'stream';
import { Readable } from 'stream';
import { IS_BROWSER, SC_ATTR, SC_ATTR_VERSION, SC_VERSION } from '../constants';
import StyleSheet from '../sheet';
import styledError from '../utils/error';
import { joinStringArray } from '../utils/joinStrings';
import getNonce from '../utils/nonce';
import { StyleSheetManager } from './StyleSheetManager';

declare const __SERVER__: boolean;

const CLOSING_TAG_R = /^\s*<\/[a-z]/i;
const OPENING_TAG_R = /<[^/>][^>]*>/;

const CONTENT_IN_TAG_R = /<[^>]+>[^<]+<\/[^>]+>/;

export default class ServerStyleSheet {
  instance: StyleSheet;
  sealed: boolean;

  constructor() {
    this.instance = new StyleSheet({ isServer: true });
    this.sealed = false;
  }

  _emitSheetCSS = (): string => {
    const css = this.instance.toString();
    const nonce = getNonce();
    const attrs = [
      nonce && `nonce="${nonce}"`,
      `${SC_ATTR}="true"`,
      `${SC_ATTR_VERSION}="${SC_VERSION}"`,
    ];
    const htmlAttr = joinStringArray(attrs.filter(Boolean) as string[], ' ');

    return `<style ${htmlAttr}>${css}</style>`;
  };

  collectStyles(children: any): JSX.Element {
    if (this.sealed) {
      throw styledError(2);
    }

    return <StyleSheetManager sheet={this.instance}>{children}</StyleSheetManager>;
  }

  getStyleTags = (): string => {
    if (this.sealed) {
      throw styledError(2);
    }

    return this._emitSheetCSS();
  };

  getStyleElement = () => {
    if (this.sealed) {
      throw styledError(2);
    }

    const props = {
      [SC_ATTR]: '',
      [SC_ATTR_VERSION]: SC_VERSION,
      dangerouslySetInnerHTML: {
        __html: this.instance.toString(),
      },
    };

    const nonce = getNonce();
    if (nonce) {
      (props as any).nonce = nonce;
    }

    // v4 returned an array for this fn, so we'll do the same for v5 for backward compat
    return [<style {...props} key="sc-0-0" />];
  };

  // eslint-disable-next-line consistent-return
  // @ts-expect-error alternate return types are not possible due to code transformation
  interleaveWithNodeStream(input: Readable): streamInternal.Transform {
    if (!__SERVER__ || IS_BROWSER) {
      throw styledError(3);
    } else if (this.sealed) {
      throw styledError(2);
    }

    if (__SERVER__) {
      this.seal();

      const { Transform } = require('stream');

      const readableStream: Readable = input;
      const { instance: sheet, _emitSheetCSS } = this;

      let queue: string[] = [];

      const takeStylesFromQueue = () => {
        const styles = queue.join('\n');
        queue = [];
        return styles;
      };

      const splitHtmlByIndex = (html: string, splitByIndex: number) => {
        const before = html.slice(0, splitByIndex);
        const after = html.slice(splitByIndex);
        return [before, after];
      };

      const transformer: streamInternal.Transform = new Transform({
        transform: function appendStyleChunks(
          chunk: string,
          /* encoding */
          _: string,
          callback: Function
        ) {
          // Get the chunk and retrieve the sheet's CSS as an HTML chunk,
          // then reset its rules so we get only new ones for the next chunk
          const renderedHtml = chunk.toString();
          const html = _emitSheetCSS();

          sheet.clearTag();

          // we don't need to insert an empty <style> tag into the response,
          // which is related to "_emitSheetCSS" which will return an empty <style> tag
          // even if we don't have styles to send
          if (
            !CONTENT_IN_TAG_R.test(html) &&
            // also we want to check if we need to shift all of our styles
            queue.length === 0
          ) {
            this.push(renderedHtml);
            callback();
            return;
          }
          // prepend style html to chunk, unless the start of the chunk is a
          // closing tag in which case append right after that
          else if (CLOSING_TAG_R.test(renderedHtml)) {
            const endOfClosingTag = renderedHtml.indexOf('>') + 1;
            const [before, after] = splitHtmlByIndex(renderedHtml, endOfClosingTag);

            queue.push(html);

            this.push(before + takeStylesFromQueue() + after);
          } else if (OPENING_TAG_R.test(renderedHtml)) {
            // check if we have open tags
            const startOfStartingTag = renderedHtml.search(OPENING_TAG_R);
            const [before, after] = splitHtmlByIndex(renderedHtml, startOfStartingTag);

            queue.push(html);

            this.push(before + takeStylesFromQueue() + after);
          } else {
            // edge case case when we don't have any tags, only content such as an svg path or large text
            queue.push(html);
            this.push(renderedHtml);
          }

          callback();
        },
      });

      readableStream.on('error', err => {
        // forward the error to the transform stream
        transformer.emit('error', err);
      });

      return readableStream.pipe(transformer);
    }
  }

  seal = (): void => {
    this.sealed = true;
  };
}
