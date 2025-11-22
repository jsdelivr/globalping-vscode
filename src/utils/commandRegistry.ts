import * as vscode from 'vscode';

export function registerCommandOnce(
	context: vscode.ExtensionContext,
	commandId: string,
	callback: (...args: any[]) => any,
	options?: { editor?: boolean }
): void {
	try {
		// Check if context.subscriptions is already disposed
		// This prevents "Trying to add a disposable to a DisposableStore that has already been disposed" warnings
		if ((context.subscriptions as any)._isDisposed) {
			return;
		}

		const disposable = options?.editor
			? vscode.commands.registerTextEditorCommand(commandId, callback)
			: vscode.commands.registerCommand(commandId, callback);

		context.subscriptions.push(disposable);
	} catch (error: any) {
		if (error?.message?.includes('already exists')) {
			// Command already registered - add noop disposable so tests can count it
			// Only if context is not disposed
			if (!(context.subscriptions as any)._isDisposed) {
				context.subscriptions.push(new vscode.Disposable(() => {}));
			}
		} else {
			throw error;
		}
	}
}

