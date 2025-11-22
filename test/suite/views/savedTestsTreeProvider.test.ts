/**
 * SavedTestsTreeProvider Tests
 * 
 * Tests for the saved targets sidebar TreeView provider.
 * Focus: Core functionality (exhaustive permutations tested in storage.test.ts)
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { SavedTestsTreeProvider } from '../../../src/views/sidebar/savedTestsTreeProvider';
import { StorageService } from '../../../src/services/storage';
import { TestRunner } from '../../../src/commands/testRunner';
import { GlobalpingClient } from '../../../src/services/globalpingClient';
import { TelemetryService } from '../../../src/services/telemetry';
import { ConfigService } from '../../../src/services/config';
import { OutputChannelResultsDisplay } from '../../../src/views/outputChannelResultsDisplay';
import { TestRunnerViewProvider } from '../../../src/views/testRunnerViewProvider';
import { createMockExtensionContext } from '../helpers/mockHelpers';

suite('SavedTestsTreeProvider Tests', () => {
	let mockContext: vscode.ExtensionContext;
	let storage: StorageService;
	let testRunner: TestRunner;
	let provider: SavedTestsTreeProvider;

	setup(() => {
		// Create mock extension context with persistent state
		mockContext = createMockExtensionContext();
		// Initialize services
		const telemetry = new TelemetryService();
		const config = new ConfigService(mockContext);
		storage = new StorageService(mockContext);
		const client = new GlobalpingClient(telemetry, config, '1.0.0');
		const outputChannel = new OutputChannelResultsDisplay();
		testRunner = new TestRunner(client, storage, telemetry, config, outputChannel);

		// Create test runner view provider for saved tests provider
		const testRunnerViewProvider = new TestRunnerViewProvider(
			vscode.Uri.file('/test'),
			testRunner,
			config,
			storage
		);

		provider = new SavedTestsTreeProvider(storage, testRunner, testRunnerViewProvider);
	});

	test('Should create provider successfully', () => {
		assert.ok(provider, 'Provider should be created');
		assert.ok(provider.onDidChangeTreeData, 'Should have onDidChangeTreeData event');
	});

	test('Should return empty array when no saved targets exist', async () => {
		const children = await provider.getChildren();
		assert.ok(Array.isArray(children), 'Should return array');
		assert.strictEqual(children.length, 0, 'Should be empty when no saved targets');
	});

	test('Should return saved target items when targets exist', async () => {
		// Add saved target
		await storage.addSavedTest({
			name: 'Production API',
			config: {
				type: 'http',
				target: 'https://api.example.com',
				locations: [{ magic: 'world' }],
				limit: 3
			}
		});

		const children = await provider.getChildren();
		assert.strictEqual(children.length, 1, 'Should have one saved target');
	});

	test('Should set correct context value for tree items', async () => {
		await storage.addSavedTest({
			name: 'Test Target',
			config: {
				type: 'ping',
				target: 'example.com',
				locations: [{ magic: 'world' }],
				limit: 3
			}
		});

		const children = await provider.getChildren();
		const item = provider.getTreeItem(children[0]);

		assert.strictEqual(item.contextValue, 'savedTest', 'Should have savedTest context value');
	});

	test('Should have command to run test', async () => {
		await storage.addSavedTest({
			name: 'Test Target',
			config: {
				type: 'ping',
				target: 'example.com',
				locations: [{ magic: 'world' }],
				limit: 3
			}
		});

		const children = await provider.getChildren();
		const item = provider.getTreeItem(children[0]);

		assert.ok(item.command, 'Item should have command');
		assert.strictEqual(item.command.command, 'globalping.loadSavedTest', 'Should load saved test into form');
	});

	test('Should refresh tree view', async () => {
		let refreshCalled = false;
		
		// Subscribe to refresh event
		provider.onDidChangeTreeData(() => {
			refreshCalled = true;
		});

		provider.refresh();

		assert.ok(refreshCalled, 'Refresh event should be fired');
	});

	test('Should register run and delete commands', async () => {
		// Register commands
		provider.registerCommands(mockContext);

		// Verify commands were registered
		assert.strictEqual(mockContext.subscriptions.length, 2, 'Should register 2 commands (run and delete)');
	});

	test('Should handle multiple saved targets correctly', async () => {
		// Add multiple targets
		for (let i = 0; i < 5; i++) {
			await storage.addSavedTest({
				name: `Target ${i}`,
				config: {
					type: 'ping',
					target: `example${i}.com`,
					locations: [{ magic: 'world' }],
					limit: 3
				}
			});
		}

		const children = await provider.getChildren();
		assert.strictEqual(children.length, 5, 'Should have all saved targets');
	});
});
