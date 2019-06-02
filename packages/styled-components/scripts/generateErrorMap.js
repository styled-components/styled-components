const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(path.join(__dirname, '../src/utils/errors.md'), 'utf8');

const errorMap = md
  .split(/^#/gm)
  .slice(1)
  .reduce((errors, str) => {
    const [, code, message] = str.split(/^.*?(\d+)\s*\n/);

    // eslint-disable-next-line no-param-reassign
    errors[code] = message;

    return errors;
  }, {});

fs.writeFileSync(
  path.join(__dirname, '../src/utils/errors.js'),
  `export default ${JSON.stringify(errorMap)};`,
  'utf8'
);
