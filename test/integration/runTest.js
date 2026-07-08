const path = require('node:path');
const { runTests } = require('@vscode/test-electron');

/**
 * Download a VS Code instance and run the integration suite inside it. The
 * extension under development is loaded from the repo root; its compiled entry
 * (dist/extension.js) must exist first (see the pretest:integration script).
 */
async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');
    const extensionTestsPath = path.resolve(__dirname, './suite/index.js');
    await runTests({ extensionDevelopmentPath, extensionTestsPath });
  } catch (err) {
    console.error('Integration tests failed:', err);
    process.exit(1);
  }
}

main();
