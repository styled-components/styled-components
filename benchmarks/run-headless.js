const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.tracing.start({ path: 'benchmark-trace.json' });
  await page.goto(`file://${path.join(__dirname, './dist/index.html')}`);
  // styled-components is auto-selected, so all we gotta do is press "Run"
  await page.waitForSelector('[data-testid="run-button"]')
  await page.click('[data-testid="run-button"]')
  await page.waitForSelector('[data-testid="run-result"]')
  const benchmarkName = await page.$eval('[data-testid="current-benchmark-name"]', node => node.innerText)
  const result = await page.$eval('[data-testid="run-result"]', node => node.innerText)
  console.log(`---${benchmarkName}---`)
  console.log(result)

  await browser.close();
})();
