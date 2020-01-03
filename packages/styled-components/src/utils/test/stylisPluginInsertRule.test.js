import Stylis from '@emotion/stylis';
import insertRulePlugin from '../stylisPluginInsertRule';

describe('stylis CSSOM insertRule plugin', () => {
  let plugin;
  let pool;
  let stylis;

  beforeEach(() => {
    pool = [];
    plugin = insertRulePlugin(value => {
      pool.push(value);
    });

    stylis = new Stylis();
    stylis.use(plugin);
  });

  it('splits rules', () => {
    stylis(
      '.a',
      `
      @media (max-width: 100) {
          color: blue;

        @supports (color:none) {
            color: red;
        }
      }
      div {
        @media (min-width: 500px) {
          color: pink;
        }
      }
    `
    );
    expect(pool.join('')).toMatchInlineSnapshot(
      `"@media (max-width:100){.a{color:blue;}@supports (color:none){.a{color:red;}}}@media (min-width:500px){.a div{color:pink;}}"`
    );
  });
});
