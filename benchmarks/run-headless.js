const path = require('path');
const puppeteer = require('puppeteer');

const tests = ['Mount deep tree', 'Mount wide tree', 'Update dynamic styles'];

(async () => {
  console.log('\nStarting headless browser...')
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.tracing.start({ path: 'benchmark-trace.json' });
  console.log('Opening benchmark app...')
  await page.goto(`file://${path.join(__dirname, './dist/index.html')}`);

  console.log('Running benchmarks... (this may take a minute; do not use your machine while these are running!)')
  for (var i = 0; i < tests.length; i++) {
    const test = tests[i];
    // styled-components is auto-selected, so all we gotta do is select the benchmark and press "Run"
    await page.select('[data-testid="benchmark-picker"]', test);
    await page.waitForSelector('[data-testid="run-button"]')
    await page.click('[data-testid="run-button"]')
    await page.waitForSelector(`[data-testid="${test} results"]`)
    const result = await page.$eval(`[data-testid="${test} results"]`, node => node.innerText)
    console.log(`\n---${test}---`)
    console.log(result)
  }

  console.log('Done!')
  await browser.close();
})();
