const assert = require('node:assert');
const vscode = require('vscode');

const COMMANDS = [
  'pocketView.showPreview',
  'pocketView.refresh',
  'pocketView.rotate',
  'pocketView.nextDevice',
  'pocketView.previousDevice',
  'pocketView.captureScreenshot',
  'pocketView.connectToUrl',
  'pocketView.toggleFullscreen',
];

suite('PocketView extension', () => {
  test('activates on startup', async () => {
    const ext = vscode.extensions.getExtension('pocketview.pocketview');
    assert.ok(ext, 'extension should be discoverable');
    await ext.activate();
    assert.strictEqual(ext.isActive, true);
  });

  test('registers every command', async () => {
    const registered = await vscode.commands.getCommands(true);
    for (const command of COMMANDS) {
      assert.ok(registered.includes(command), `command not registered: ${command}`);
    }
  });

  test('opens the preview panel without error', async () => {
    await vscode.commands.executeCommand('pocketView.showPreview');
    // Reaching here without throwing indicates the panel was created.
    assert.ok(true);
  });
});
