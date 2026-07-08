const path = require('node:path');
const Mocha = require('mocha');
const { glob } = require('glob');

/** Entry point invoked by @vscode/test-electron inside the VS Code host. */
async function run() {
  const mocha = new Mocha({ ui: 'tdd', color: true, timeout: 30000 });
  const testsRoot = __dirname;

  const files = await glob('**/*.test.js', { cwd: testsRoot });
  files.forEach((file) => mocha.addFile(path.resolve(testsRoot, file)));

  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) reject(new Error(`${failures} test(s) failed.`));
      else resolve();
    });
  });
}

module.exports = { run };
