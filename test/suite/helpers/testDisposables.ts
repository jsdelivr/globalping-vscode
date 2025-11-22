/**
 * Test Disposables Tracker
 * 
 * Utility for tracking and disposing VS Code disposables created during tests.
 * Prevents memory leaks and DisposableStore warnings.
 * 
 * Usage:
 * ```typescript
 * suite('My Suite', () => {
 *   const disposables = new TestDisposables();
 *   
 *   teardown(() => {
 *     disposables.disposeAll();
 *   });
 *   
 *   test('My Test', () => {
 *     const channel = vscode.window.createOutputChannel('Test');
 *     disposables.track(channel);
 *     // Test code here
 *   });
 * });
 * ```
 */

import * as vscode from 'vscode';

export class TestDisposables {
	private disposables: vscode.Disposable[] = [];
	private disposed = false;

	/**
	 * Track a disposable for cleanup
	 */
	track<T extends vscode.Disposable>(disposable: T): T {
		if (this.disposed) {
			console.warn('TestDisposables: Attempted to track disposable after disposeAll() was called');
			// Dispose immediately to prevent leaks
			disposable.dispose();
			return disposable;
		}
		
		this.disposables.push(disposable);
		return disposable;
	}

	/**
	 * Track multiple disposables at once
	 */
	trackAll(...disposables: vscode.Disposable[]): void {
		for (const disposable of disposables) {
			this.track(disposable);
		}
	}

	/**
	 * Dispose all tracked disposables
	 * Should be called in teardown()
	 */
	disposeAll(): void {
		if (this.disposed) {
			return;
		}

		this.disposed = true;

		// Dispose in reverse order (LIFO)
		while (this.disposables.length > 0) {
			const disposable = this.disposables.pop();
			if (disposable) {
				try {
					disposable.dispose();
				} catch (error) {
					console.error('TestDisposables: Error disposing resource:', error);
				}
			}
		}
	}

	/**
	 * Get count of tracked disposables (for debugging)
	 */
	count(): number {
		return this.disposables.length;
	}

	/**
	 * Check if already disposed
	 */
	isDisposed(): boolean {
		return this.disposed;
	}
}

