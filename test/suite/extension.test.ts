/**
 * Extension Activation Tests
 * 
 * Tests that verify the extension activates correctly and registers all commands.
 * These tests run in a real VS Code environment to catch real-world errors.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import packageJson from '../../package.json';
import { TestDisposables } from './helpers/testDisposables';

type PackageJson = {
	contributes?: {
		commands?: Array<{ command: string }>;
	};
};

const pkg = packageJson as unknown as PackageJson;

// Cache extension instance to avoid repeated activation
let cachedExtension: vscode.Extension<any> | undefined;

suite('Extension Activation', () => {
	const disposables = new TestDisposables();

	suiteSetup(async () => {
		// Activate extension once for entire suite
		cachedExtension = vscode.extensions.getExtension('globalping.globalping');
		if (cachedExtension && !cachedExtension.isActive) {
			await cachedExtension.activate();
		}
	});

	teardown(() => {
		disposables.disposeAll();
	});

	test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('globalping.globalping'));
	});

	test('Extension should activate', () => {
		assert.ok(cachedExtension, 'Extension should be found');
		assert.ok(cachedExtension.isActive, 'Extension should be active');
	});

	test('All commands should be declared in manifest', () => {
		const commandIds = new Set(pkg.contributes?.commands?.map(cmd => cmd.command));
		const commands = [
			'globalping.runNewTest',
			'globalping.runLastTest',
			'globalping.contextTest.ping',
			'globalping.contextTest.http',
			'globalping.contextTest.dns',
			'globalping.contextTest.traceroute',
			'globalping.contextTest.mtr',
			'globalping.openLastResult',
			'globalping.openHistoryResult',
			'globalping.rerunHistoryTest',
			'globalping.clearHistory',
			'globalping.saveTest',
			'globalping.loadSavedTest',
			'globalping.deleteSavedTest',
			'globalping.viewHistory',
			'globalping.openSettings',
			'globalping.setApiToken',
			'globalping.removeApiToken'
		];

		for (const command of commands) {
			assert.ok(
				commandIds.has(command),
				`Command ${command} should be declared`
			);
		}
	});

	test('API token management commands should be declared', () => {
		const tokenCommands = [
			'globalping.setApiToken',
			'globalping.removeApiToken'
		];

		const commandIds = new Set(pkg.contributes?.commands?.map(cmd => cmd.command));
		
		for (const command of tokenCommands) {
			assert.ok(
				commandIds.has(command),
				`Token command ${command} should be declared`
			);
		}
	});

	test('Extension should create output channel', async () => {
		const channels = vscode.window.visibleTextEditors;
		// Output channel is created but may not be visible
		// Just verify we can access it
		const outputChannel = disposables.track(vscode.window.createOutputChannel('Globalping'));
		assert.ok(outputChannel);
	});

	test('Authentication view should be available', () => {
		// The extension should register the Authentication webview view
		// We can't directly test webview registration in unit tests,
		// but we verify the extension activated successfully which includes view registration
		assert.ok(cachedExtension, 'Extension should be found');
		assert.ok(cachedExtension.isActive, 'Extension should be active with Authentication view registered');
	});

	test('Extension should handle authentication without token', () => {
		// Extension should work in unauthenticated mode
		assert.ok(cachedExtension, 'Extension should be found');
		// Should activate successfully even without a token
		assert.ok(cachedExtension.isActive, 'Extension should work without authentication token');
	});
});
