import { toMatchImageSnapshot } from 'jest-image-snapshot';
import puppeteer from 'puppeteer';
import app from '../example/devServer.js';

expect.extend({ toMatchImageSnapshot });

const PORT = 9000;

const urlWhitelist = [
  new RegExp(`http:\/\/localhost:${PORT}.*`),
  /https:\/\/unpkg\.com\/react@[\d\.\-\w]+\/umd\/react\.production\.min\.js/,
  /https:\/\/unpkg\.com\/react-dom@[\d\.\-\w]+\/umd\/react-dom\.production\.min\.js/,
  /https:\/\/unpkg\.com\/react-dom@[\d\.\-\w]+\/umd\/react-dom-server\.browser\.production\.min\.js/,
  /https:\/\/unpkg\.com\/babel-standalone@[\d\.\-\w]+\/babel\.min\.js/,
];

const globalCss = `
  * {
    -webkit-animation: unset !important;
    animation: unset !important;
    font-family: 'Arial' !important;
    font-smooth: never !important;
  }
  pre, pre * {
    font-family: 'Courier' !important;
  }
  .hero-header {
    min-height: auto !important;
  }
`;

function startServer(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, error => {
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
        throw new Error(req.url());
        req.abort();
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
