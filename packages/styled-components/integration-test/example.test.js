import { toMatchImageSnapshot } from 'jest-image-snapshot';
import puppeteer from 'puppeteer';
import app from '../example/devServer';

expect.extend({ toMatchImageSnapshot });

const PORT = 9000;

const urlWhitelist = [
  new RegExp(`http://localhost:${PORT}.*`),
  /https:\/\/unpkg.com\/react@[\d.]+\/umd\/react.production.min.js/,
  /https:\/\/unpkg.com\/react-dom@[\d.]+\/umd\/react-dom.production.min.js/,
  /https:\/\/unpkg.com\/react-dom@[\d.]+\/umd\/react-dom-server.browser.production.min.js/,
  /https:\/\/unpkg.com\/babel-standalone@[\d.]+\/babel.min.js/,
];

const globalCss = `
  * {
    font-family: 'Arial' !important;
    font-smooth: never !important;
    line-height: 1.15 !important;
  }
  pre, pre * {
    font-family: 'Courier' !important;
    font-size: .9rem;
  }
`;

function startServer(appServer, port) {
  return new Promise((resolve, reject) => {
    const server = appServer.listen(port, error => {
      if (error) {
        reject(error);
      }
      resolve(server);
    });
  });
}

describe('example page', () => {
  let server;
  let browser;
  let page;

  beforeAll(async () => {
    server = await startServer(app, PORT);
    browser = await puppeteer.launch({
      executablePath: process.env.GOOGLE_CHROME_BINARY || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-lcd-text'],
    });
    page = await browser.newPage();
    page.on('request', req => {
      if (urlWhitelist.find(regexp => req.url().match(regexp))) {
        req.continue();
      } else {
        req.abort();
        throw new Error(req.url());
      }
    });
    await page.setRequestInterception(true);
    await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
  });

  afterAll(async () => {
    await page.close();
    await browser.close();
    await server.close();
  });

  it('should match screenshot', async () => {
    await page.goto(`http://localhost:${PORT}`);
    await page.addStyleTag({ content: globalCss });
    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot).toMatchImageSnapshot({
      failureThreshold: '0.06',
      failureThresholdType: 'percent',
    });
  });
});
