import * as vscode from 'vscode';
import type { PreviewController } from '../preview/PreviewController';

/**
 * Register every PocketView command and return the disposables. All commands
 * delegate to the shared {@link PreviewController}.
 */
export function registerCommands(controller: PreviewController): vscode.Disposable[] {
  const show = vscode.commands.registerCommand('pocketView.showPreview', () =>
    controller.show(),
  );

  const withPanel = (fn: () => void) => async () => {
    await controller.show();
    fn();
  };

  return [
    show,
    vscode.commands.registerCommand('pocketView.refresh', withPanel(() => controller.refresh())),
    vscode.commands.registerCommand('pocketView.rotate', withPanel(() => controller.rotate())),
    vscode.commands.registerCommand(
      'pocketView.nextDevice',
      withPanel(() => controller.cycleDevice(1)),
    ),
    vscode.commands.registerCommand(
      'pocketView.previousDevice',
      withPanel(() => controller.cycleDevice(-1)),
    ),
    vscode.commands.registerCommand(
      'pocketView.captureScreenshot',
      withPanel(() => controller.requestScreenshot()),
    ),
    vscode.commands.registerCommand('pocketView.connectToUrl', async () => {
      await controller.show();
      await controller.connectToUrl();
    }),
    vscode.commands.registerCommand(
      'pocketView.toggleFullscreen',
      withPanel(() => controller.toggleFullscreen()),
    ),
  ];
}
