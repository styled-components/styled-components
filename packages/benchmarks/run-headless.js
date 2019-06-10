const path = require('path');
const puppeteer = require('puppeteer');

const tests = ['Mount deep tree', 'Mount wide tree', 'Update dynamic styles'];
const tracing = process.argv.some(arg => arg.indexOf('tracing') > -1);

if (tracing) {
  console.log(
    '\nTracing enabled. (note that this might impact benchmark results, we recommend leaving this turned off unless you need a trace)'
  );
}

(async () => {
  console.log('\nStarting headless browser...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  console.log('Opening benchmark app...');
  await page.goto(`file://${path.join(__dirname, './index.html')}`);

  console.log(
    'Running benchmarks... (this may take a minute or two; do not use your machine while these are running!)'
  );
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const traceFile = `${test.toLowerCase().replace(/\s/g, '-')}-trace.json`;
    // styled-components is auto-selected, so all we gotta do is select the benchmark and press "Run"
    await page.select('[data-testid="benchmark-picker"]', test);
    await page.waitForSelector('[data-testid="run-button"]');
    if (tracing) await page.tracing.start({ path: traceFile });
    await page.click('[data-testid="run-button"]');
    await page.waitForSelector(`[data-testid="${test} results"]`);
    if (tracing) await page.tracing.stop();
    const result = await page.$eval(`[data-testid="${test} results"]`, node => node.innerText);
    console.log(`\n---${test}---`);
    console.log(result);
    console.log('Trace written to', traceFile);
  }

  console.log('Done!');
  await browser.close();
})();
