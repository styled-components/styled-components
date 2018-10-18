const childProcess = require('child_process');
const path = require('path');

const fork = file =>
  new Promise((res, rej) => {
    const child = childProcess.fork(path.join(__dirname, file));
    child.on('exit', function(code, signal) {
      res();
    });
    child.on('error', rej);
  });

const spawn = (cmd, args, opts) => {
  return new Promise((res, rej) => {
    const child = childProcess.spawn(cmd, args, opts);

    child.stdout.on('data', data => console.log(data.toString()));

    child.stderr.on('data', data => console.error(data.toString()));

    child.on('close', code => {
      if (code === 0) return res();
      rej(code);
    });
  });
};

(async () => {
  try {
    console.log('\n---Server-rendering benchmarks---\n');
    await spawn('yarn', ['run', 'benchmark'], {
      cwd: path.join(__dirname, './server'),
    });
    console.log('\n---Client-rendering benchmarks---\n');
    await fork('./client/run-headless.js');
  } catch (err) {
    throw err;
  }
})();
