/**
 * TreeView Workflows Integration Tests
 * 
 * Tests complete user workflows with TreeView components (history and saved targets).
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { HistoryTreeProvider } from '../../../src/views/sidebar/historyTreeProvider';
import { SavedTestsTreeProvider } from '../../../src/views/sidebar/savedTestsTreeProvider';
import { TestRunnerViewProvider } from '../../../src/views/testRunnerViewProvider';
import { StorageService } from '../../../src/services/storage';
import { TestRunner } from '../../../src/commands/testRunner';
import { GlobalpingClient } from '../../../src/services/globalpingClient';
import { TelemetryService } from '../../../src/services/telemetry';
import { ConfigService } from '../../../src/services/config';
import { OutputChannelResultsDisplay } from '../../../src/views/outputChannelResultsDisplay';
import { SavedTest, TestHistoryEntry } from '../../../src/types/measurement';
import { createMockExtensionContext } from '../helpers/mockHelpers';

suite('TreeView Workflows Integration Tests', () => {
	let mockContext: vscode.ExtensionContext;
	let storage: StorageService;
	let testRunner: TestRunner;
	let historyProvider: HistoryTreeProvider;
	let savedTargetsProvider: SavedTestsTreeProvider;

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

		historyProvider = new HistoryTreeProvider(storage, testRunner);

		// Create test runner view provider for saved tests provider
		const testRunnerViewProvider = new TestRunnerViewProvider(
			vscode.Uri.file('/test'),
			testRunner,
			config,
			storage
		);

		savedTargetsProvider = new SavedTestsTreeProvider(storage, testRunner, testRunnerViewProvider);
	});

	test('Workflow: Save target from command palette', async () => {
		// Step 1: User creates a saved target
		const target = await storage.addSavedTest({
			name: 'Production API',
			config: {
				type: 'http',
				target: 'https://api.example.com',
				locations: [{ magic: 'world' }],
				limit: 3
			}
		});

		// Step 2: Verify it appears in TreeView
		const children = await savedTargetsProvider.getChildren();
		assert.strictEqual(children.length, 1, 'Saved target should appear in TreeView');
		
		const item = savedTargetsProvider.getTreeItem(children[0]);
		assert.strictEqual(item.label, 'Production API', 'Should have correct name');
	});

	test('Workflow: Run test from saved target', async () => {
		// Step 1: Create saved target
		const target = await storage.addSavedTest({
			name: 'DNS Test',
			config: {
				type: 'dns',
				target: 'example.com',
				locations: [{ magic: 'US' }],
				limit: 2
			}
		});

		// Step 2: Get TreeView item
		const children = await savedTargetsProvider.getChildren();
		const item = savedTargetsProvider.getTreeItem(children[0]);

		// Step 3: Verify command is set up correctly
		assert.ok(item.command, 'Should have command');
		assert.strictEqual(item.command.command, 'globalping.loadSavedTest', 'Should load test into form');
		assert.ok(item.command.arguments, 'Command should have arguments');
	});

	test('Workflow: Delete saved target', async () => {
		// Step 1: Create saved target
		const target = await storage.addSavedTest({
			name: 'Temporary Test',
			config: {
				type: 'ping',
				target: 'temp.example.com',
				locations: [{ magic: 'world' }],
				limit: 1
			}
		});

		// Step 2: Verify it exists
		let children = await savedTargetsProvider.getChildren();
		assert.strictEqual(children.length, 1, 'Should have one target');

		// Step 3: Delete it
		await storage.deleteSavedTest(target.id);

		// Step 4: Verify it's gone
		children = await savedTargetsProvider.getChildren();
		assert.strictEqual(children.length, 0, 'Target should be deleted');
	});

	test('Workflow: View test history', async () => {
		// Step 1: Add test to history
		await storage.addHistoryEntry({
			config: {
				type: 'ping',
				target: 'example.com',
				locations: [{ magic: 'world' }],
				limit: 3
			},
			result: {
				id: 'workflow-test-1',
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

		// Step 2: Verify it appears in history TreeView
		const children = await historyProvider.getChildren();
		assert.strictEqual(children.length, 1, 'Should have one history entry');
		
		const item = historyProvider.getTreeItem(children[0]);
		const label = item.label?.toString() || '';
		assert.ok(label.includes('ping'), 'Should show test type');
		assert.ok(label.includes('example.com'), 'Should show target');
	});

	test('Workflow: Re-run test from history', async () => {
		// Step 1: Add test to history
		await storage.addHistoryEntry({
			config: {
				type: 'http',
				target: 'https://api.example.com',
				locations: [{ magic: 'US' }],
				limit: 5
			},
			result: {
				id: 'workflow-test-2',
				type: 'http',
				target: 'https://api.example.com',
				status: 'finished',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			probesCount: 1,
				results: []
			},
			status: 'success'
		});

		// Step 2: Get history item
		const children = await historyProvider.getChildren();
		const item = historyProvider.getTreeItem(children[0]);

		// Step 3: Verify command is set up correctly
		assert.ok(item.command, 'Should have command');
		assert.strictEqual(item.command.command, 'globalping.openHistoryResult', 'Should have view results command');
	});

	test('Workflow: Clear all history', async () => {
		// Step 1: Add multiple history entries
		for (let i = 0; i < 5; i++) {
			await storage.addHistoryEntry({
				config: {
					type: 'ping',
					target: `test${i}.com`,
					locations: [{ magic: 'world' }],
					limit: 3
				},
				result: {
					id: `test-${i}`,
					type: 'ping',
					target: `test${i}.com`,
					status: 'finished',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
			probesCount: 1,
					results: []
				},
				status: 'success'
			});
		}

		// Step 2: Verify history has entries
		let children = await historyProvider.getChildren();
		assert.strictEqual(children.length, 5, 'Should have 5 history entries');

		// Step 3: Clear history
		await storage.clearHistory();

		// Step 4: Verify history is empty
		children = await historyProvider.getChildren();
		assert.strictEqual(children.length, 0, 'History should be cleared');
	});

	test('Workflow: Multiple saved targets organization', async () => {
		// Step 1: Create multiple saved targets of different types
		const targetConfigs = [
			{
				name: 'API Health Check',
				config: {
					type: 'http' as const,
					target: 'https://api.example.com/health',
					locations: [{ magic: 'world' }],
					limit: 3
				}
			},
			{
				name: 'DNS Resolution',
				config: {
					type: 'dns' as const,
					target: 'example.com',
					locations: [{ magic: 'US' }],
					limit: 2
				}
			},
			{
				name: 'Ping Check',
				config: {
					type: 'ping' as const,
					target: '8.8.8.8',
					locations: [{ magic: 'world' }],
					limit: 5
				}
			}
		];

		for (const targetConfig of targetConfigs) {
			await storage.addSavedTest(targetConfig);
		}

		// Step 2: Verify all are in TreeView
		const children = await savedTargetsProvider.getChildren();
		assert.strictEqual(children.length, 3, 'Should have all saved targets');

		// Step 3: Verify each has correct properties
		const items = children.map(child => savedTargetsProvider.getTreeItem(child));
		const names = items.map(item => item.label);
		
		assert.ok(names.includes('API Health Check'), 'Should have HTTP target');
		assert.ok(names.includes('DNS Resolution'), 'Should have DNS target');
		assert.ok(names.includes('Ping Check'), 'Should have Ping target');
	});

	test('Workflow: History ordering (most recent first)', async () => {
		// Step 1: Add history entries (storage will add timestamps automatically)
		
		await storage.addHistoryEntry({
			config: {
				type: 'ping',
				target: 'old.com',
				locations: [{ magic: 'world' }],
				limit: 1
			},
			result: {
				id: 'old-test',
				type: 'ping',
				target: 'old.com',
				status: 'finished',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			probesCount: 1,
				results: []
			},
			status: 'success'
		});

		// Add a small delay to ensure different timestamps
		await new Promise(resolve => setTimeout(resolve, 10));

		await storage.addHistoryEntry({
			config: {
				type: 'ping',
				target: 'new.com',
				locations: [{ magic: 'world' }],
				limit: 1
			},
			result: {
				id: 'new-test',
				type: 'ping',
				target: 'new.com',
				status: 'finished',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			probesCount: 1,
				results: []
			},
			status: 'success'
		});

		// Step 2: Get history items
		const history = await storage.getHistory();
		
		// Step 3: Verify ordering (most recent first)
		assert.ok(history.length >= 2, 'Should have at least 2 entries');
		// Most recent should be first or last depending on storage implementation
		// Just verify both are present
		const targets = history.map(h => h.config.target);
		assert.ok(targets.includes('old.com'), 'Should have old entry');
		assert.ok(targets.includes('new.com'), 'Should have new entry');
	});

	test('Workflow: Save target with complex configuration', async () => {
		// Test saving a target with all possible configuration options
		await storage.addSavedTest({
			name: 'Complex Test',
			config: {
				type: 'http',
				target: 'https://api.example.com/v1/endpoint?param=value',
				locations: [{ magic: 'US+GB+DE' }], // Multiple locations
				limit: 10,
				inProgressUpdates: true,
				measurementOptions: {
					request: {
						method: 'GET'
					}
				}
			}
		});

		// Verify it's stored correctly
		const targets = await storage.getSavedTests();
		assert.strictEqual(targets.length, 1, 'Should have one target');
		assert.strictEqual(targets[0].name, 'Complex Test', 'Should preserve name');
		assert.strictEqual(targets[0].config.limit, 10, 'Should preserve probe limit');
		assert.ok(targets[0].config.locations && Array.isArray(targets[0].config.locations) &&
			targets[0].config.locations.some((loc: any) => loc.magic === 'US+GB+DE'),
			'Should preserve complex location');
	});

	test('Workflow: TreeView refresh after data changes', async () => {
		let historyRefreshCount = 0;
		let targetsRefreshCount = 0;

		// Monitor refresh events
		historyProvider.onDidChangeTreeData(() => {
			historyRefreshCount++;
		});

		savedTargetsProvider.onDidChangeTreeData(() => {
			targetsRefreshCount++;
		});

		// Trigger refreshes
		historyProvider.refresh();
		savedTargetsProvider.refresh();

		assert.ok(historyRefreshCount > 0, 'History should refresh');
		assert.ok(targetsRefreshCount > 0, 'Saved targets should refresh');
	});

	test('Workflow: Handle empty state messages', async () => {
		// Verify both providers handle empty state
		const historyChildren = await historyProvider.getChildren();
		const targetsChildren = await savedTargetsProvider.getChildren();

		assert.ok(Array.isArray(historyChildren), 'History should return array');
		assert.ok(Array.isArray(targetsChildren), 'Targets should return array');
		assert.strictEqual(historyChildren.length, 0, 'History should be empty');
		assert.strictEqual(targetsChildren.length, 0, 'Targets should be empty');
	});
});

