import packageJson from '../package.json';

const context = require.context('./implementations/', true, /index\.js$/);
const { dependencies } = packageJson;

const toImplementations = context =>
  context.keys().map(path => {
    const components = context(path).default;
    const name = path.split('/')[1];
    const version = dependencies[name] || '';
    return { components, name, version };
  });

const toObject = impls =>
  impls.reduce((acc, impl) => {
    acc[impl.name] = impl;
    return acc;
  }, {});

const map = toObject(toImplementations(context));

export default map;
