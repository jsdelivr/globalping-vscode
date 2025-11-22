/**
 * HistoryTreeProvider Tests
 * 
 * Tests for the history sidebar TreeView provider.
 * Focus: Core functionality (exhaustive permutations tested in storage.test.ts)
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { HistoryTreeProvider } from '../../../src/views/sidebar/historyTreeProvider';
import { StorageService } from '../../../src/services/storage';
import { TestRunner } from '../../../src/commands/testRunner';
import { GlobalpingClient } from '../../../src/services/globalpingClient';
import { TelemetryService } from '../../../src/services/telemetry';
import { ConfigService } from '../../../src/services/config';
import { OutputChannelResultsDisplay } from '../../../src/views/outputChannelResultsDisplay';
import { createMockExtensionContext } from '../helpers/mockHelpers';

suite('HistoryTreeProvider Tests', () => {
	let mockContext: vscode.ExtensionContext;
	let storage: StorageService;
	let testRunner: TestRunner;
	let provider: HistoryTreeProvider;

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
		
		provider = new HistoryTreeProvider(storage, testRunner);
	});

	test('Should create provider successfully', () => {
		assert.ok(provider, 'Provider should be created');
		assert.ok(provider.onDidChangeTreeData, 'Should have onDidChangeTreeData event');
	});

	test('Should return empty array when no history exists', async () => {
		const children = await provider.getChildren();
		assert.ok(Array.isArray(children), 'Should return array');
		assert.strictEqual(children.length, 0, 'Should be empty when no history');
	});

	test('Should return history items when history exists', async () => {
		// Add test entry to history
		await storage.addHistoryEntry({
			config: {
				type: 'ping',
				target: 'example.com',
				locations: [{ magic: 'world' }],
				limit: 3
			},
			result: {
				id: 'test-123',
				type: 'ping',
				target: 'example.com',
				status: 'finished',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				probesCount: 1,
				results: []
			},
			status: 'success'
		});

		const children = await provider.getChildren();
		assert.strictEqual(children.length, 1, 'Should have one history item');
	});

	test('Should set correct context value for tree items', async () => {
		await storage.addHistoryEntry({
			config: {
				type: 'ping',
				target: 'example.com',
				locations: [{ magic: 'world' }],
				limit: 3
			},
			result: {
				id: 'test-1',
				type: 'ping',
				target: 'example.com',
				status: 'finished',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				probesCount: 1,
				results: []
			},
			status: 'success'
		});

		const children = await provider.getChildren();
		const item = provider.getTreeItem(children[0]);
		
		assert.strictEqual(item.contextValue, 'historyItem', 'Should have historyItem context value');
	});

	test('Should have command to open results', async () => {
		await storage.addHistoryEntry({
			config: {
				type: 'ping',
				target: 'example.com',
				locations: [{ magic: 'world' }],
				limit: 3
			},
			result: {
				id: 'test-1',
				type: 'ping',
				target: 'example.com',
				status: 'finished',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				probesCount: 1,
				results: []
			},
			status: 'success'
		});

		const children = await provider.getChildren();
		const item = provider.getTreeItem(children[0]);
		
		assert.ok(item.command, 'Item should have command');
		assert.strictEqual(item.command.command, 'globalping.openHistoryResult', 'Should open history result');
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

	test('Should register clear history command', async () => {
		// Add some history
		await storage.addHistoryEntry({
			config: {
				type: 'ping',
				target: 'example.com',
				locations: [{ magic: 'world' }],
				limit: 3
			},
			result: {
				id: 'test-1',
				type: 'ping',
				target: 'example.com',
				status: 'finished',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				probesCount: 1,
				results: []
			},
			status: 'success'
		});

		const history = await storage.getHistory();
		assert.ok(history.length > 0, 'History should have entries');

		// Register commands
		provider.registerCommands(mockContext);

		// Verify command was registered
		assert.ok(mockContext.subscriptions.length > 0, 'Should register commands');
	});

	test('Should handle multiple history entries correctly', async () => {
		// Add multiple entries
		for (let i = 0; i < 10; i++) {
			await storage.addHistoryEntry({
				config: {
					type: 'ping',
					target: `example${i}.com`,
					locations: [{ magic: 'world' }],
					limit: 3
				},
				result: {
					id: `test-${i}`,
					type: 'ping',
					target: `example${i}.com`,
					status: 'finished',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				probesCount: 1,
					results: []
				},
				status: 'success'
			});
		}

		const children = await provider.getChildren();
		assert.strictEqual(children.length, 10, 'Should have all history entries');
	});
});
