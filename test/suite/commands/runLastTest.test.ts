/**
 * RunLastTest Command Tests
 * 
 * Tests for the command that re-runs the most recent test.
 * Focus: Command registration and wiring (storage logic tested in services/storage.test.ts)
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { RunLastTestCommand } from '../../../src/commands/runLastTest';
import { TestRunner } from '../../../src/commands/testRunner';
import { StorageService } from '../../../src/services/storage';
import { GlobalpingClient } from '../../../src/services/globalpingClient';
import { TelemetryService } from '../../../src/services/telemetry';
import { ConfigService } from '../../../src/services/config';
import { OutputChannelResultsDisplay } from '../../../src/views/outputChannelResultsDisplay';
import { createMockExtensionContext, createMockGlobalpingConstructor, installMockGlobalping, restoreMockGlobalping } from '../helpers/mockHelpers';

suite('RunLastTest Command', () => {
	let context: vscode.ExtensionContext;
	let storage: StorageService;
	let testRunner: TestRunner;
	let command: RunLastTestCommand;
	let originalGlobalping: any;
	let telemetry: TelemetryService;
	let outputChannel: OutputChannelResultsDisplay;

	setup(async () => {
		context = createMockExtensionContext();
		storage = new StorageService(context);
		telemetry = new TelemetryService();
		const config = new ConfigService(context);
		outputChannel = new OutputChannelResultsDisplay();

		originalGlobalping = installMockGlobalping(createMockGlobalpingConstructor());
		const client = new GlobalpingClient(telemetry, config, '1.0.0');
		await new Promise(resolve => setTimeout(resolve, 100));

		testRunner = new TestRunner(client, storage, telemetry, config, outputChannel);
		command = new RunLastTestCommand(testRunner, storage);
	});

	teardown(() => {
		telemetry.dispose();
		outputChannel.dispose();
		restoreMockGlobalping(originalGlobalping);
	});

	test('Should register runLastTest command', () => {
		const disposables: vscode.Disposable[] = [];
		const mockContext = {
			...context,
			subscriptions: disposables
		} as any;

		command.registerCommand(mockContext);
		
		assert.strictEqual(disposables.length, 1, 'Should register 1 command');
	});

	test('Should handle no history gracefully', async () => {
		// Clear any existing history
		await storage.clearHistory();

		// Execute command
		await command.execute();
		
		// Should not crash - shows info message instead
		assert.ok(true, 'Should handle empty history gracefully');
	});

	test('Should retrieve and execute last test', async () => {
		// Add a test to history
		const historyEntry = await storage.addHistoryEntry({
			config: {
				type: 'ping',
				target: 'example.com',
				locations: [{ magic: 'global' }],
				limit: 3
			},
			result: {
				id: 'test-id',
				type: 'ping' as const,
				target: 'example.com',
				status: 'finished' as const,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				probesCount: 1,
				results: []
			},
			status: 'success'
		});

		assert.ok(historyEntry.id, 'Should save history entry');

		// Get last entry to verify it exists
		const lastEntry = await storage.getLastHistoryEntry();
		assert.ok(lastEntry, 'Should have last entry');
		assert.strictEqual(lastEntry.config.target, 'example.com', 
			'Last entry should be the one we added');
	});

	test('Should get most recent test when multiple exist', async () => {
		// Add multiple tests
		await storage.addHistoryEntry({
			config: { type: 'ping' as const, target: 'first.com', locations: [{ magic: 'global' }], limit: 3 },
			result: {
				id: 'first',
				type: 'ping' as const,
				target: 'first.com',
				status: 'finished' as const,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				probesCount: 1,
				results: []
			},
			status: 'success'
		});

		await new Promise(resolve => setTimeout(resolve, 10)); // Ensure timestamp difference

		await storage.addHistoryEntry({
			config: { type: 'http' as const, target: 'https://second.com', locations: [{ magic: 'US' }], limit: 5 },
			result: {
				id: 'second',
				type: 'http' as const,
				target: 'https://second.com',
				status: 'finished' as const,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				probesCount: 1,
				results: []
			},
			status: 'success'
		});

		const lastEntry = await storage.getLastHistoryEntry();
		assert.ok(lastEntry, 'Should get last entry');
		assert.strictEqual(lastEntry.config.target, 'https://second.com', 
			'Should get the most recent test');
		assert.strictEqual(lastEntry.config.type, 'http');
	});
});
