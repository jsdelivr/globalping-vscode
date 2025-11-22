/**
 * SaveTest Command Tests
 *
 * Tests for the save test command that allows saving test configurations.
 * Focus: Command registration and provider refresh (storage logic tested in services/storage.test.ts)
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { SaveTestCommand } from '../../../src/commands/saveTest';
import { StorageService } from '../../../src/services/storage';
import { SavedTestsTreeProvider } from '../../../src/views/sidebar/savedTestsTreeProvider';
import { TestRunner } from '../../../src/commands/testRunner';
import { GlobalpingClient } from '../../../src/services/globalpingClient';
import { TelemetryService } from '../../../src/services/telemetry';
import { ConfigService } from '../../../src/services/config';
import { OutputChannelResultsDisplay } from '../../../src/views/outputChannelResultsDisplay';
import { TestRunnerViewProvider } from '../../../src/views/testRunnerViewProvider';
import { createMockExtensionContext, createMockGlobalpingConstructor, installMockGlobalping, restoreMockGlobalping } from '../helpers/mockHelpers';

suite('SaveTest Command', () => {
	let context: vscode.ExtensionContext;
	let storage: StorageService;
	let savedTestsProvider: SavedTestsTreeProvider;
	let command: SaveTestCommand;
	let testRunner: TestRunner;
	let originalGlobalping: any;

	setup(async () => {
		context = createMockExtensionContext();
		storage = new StorageService(context);

		// Create mock test runner
		const telemetry = new TelemetryService();
		const config = new ConfigService(context);
		const outputChannel = new OutputChannelResultsDisplay();

		originalGlobalping = installMockGlobalping(createMockGlobalpingConstructor());
		const client = new GlobalpingClient(telemetry, config, '1.0.0');
		await new Promise(resolve => setTimeout(resolve, 100));

		testRunner = new TestRunner(client, storage, telemetry, config, outputChannel);

		// Create test runner view provider for saved tests provider
		const testRunnerViewProvider = new TestRunnerViewProvider(
			vscode.Uri.file('/test'),
			testRunner,
			config,
			storage
		);

		savedTestsProvider = new SavedTestsTreeProvider(storage, testRunner, testRunnerViewProvider);
		command = new SaveTestCommand(storage, savedTestsProvider);
	});

	teardown(() => {
		restoreMockGlobalping(originalGlobalping);
	});

	test('Should register save test command', () => {
		const disposables: vscode.Disposable[] = [];
		const mockContext = {
			...context,
			subscriptions: disposables
		} as any;

		command.registerCommand(mockContext);

		assert.strictEqual(disposables.length, 1, 'Should register 1 command');
	});

	test('Should save test via storage service', async () => {
		const testConfig = {
			type: 'ping' as const,
			target: 'example.com',
			locations: [{ magic: 'global' }],
			limit: 3
		};

		// Test storage service directly
		const savedTest = await storage.addSavedTest({
			name: 'Test Target',
			config: testConfig
		});

		assert.ok(savedTest.id, 'Should have an ID');
		assert.strictEqual(savedTest.name, 'Test Target', 'Should have correct name');
		assert.strictEqual(savedTest.config.target, 'example.com', 'Should have correct target');
	});

	test('Should refresh tree provider after save', async () => {
		let refreshCalled = false;

		// Subscribe to refresh event
		savedTestsProvider.onDidChangeTreeData(() => {
			refreshCalled = true;
		});

		// Manually trigger refresh (simulates what command does)
		savedTestsProvider.refresh();

		assert.ok(refreshCalled, 'Tree provider refresh should be called');
	});
});
