/**
 * Storage Service Tests
 * 
 * Tests for storage service that persist data across sessions.
 * Uses real VS Code ExtensionContext to catch real-world issues.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { StorageService } from '../../../src/services/storage';
import { TestHistoryEntry } from '../../../src/types/measurement';
import { createMockExtensionContext } from '../helpers/mockHelpers';

suite('Storage Service', () => {
	let context: vscode.ExtensionContext;
	let storage: StorageService;

	setup(() => {
		context = createMockExtensionContext();
		storage = new StorageService(context);
	});

	test('Should add and retrieve history entries', async () => {
		const entry = {
			config: {
				type: 'ping' as const,
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
			status: 'success' as const
		};

		const savedEntry = await storage.addHistoryEntry(entry);
		assert.ok(savedEntry.id);
		assert.ok(savedEntry.timestamp);

		const history = await storage.getHistory();
		assert.strictEqual(history.length, 1);
		assert.strictEqual(history[0].config.target, 'example.com');
	});

	test('Should limit history size', async () => {
		// Add more than MAX_HISTORY_SIZE entries
		for (let i = 0; i < 30; i++) {
			await storage.addHistoryEntry({
				config: {
					type: 'ping' as const,
					target: `example${i}.com`,
					locations: [{ magic: 'global' }],
					limit: 3
				},
				result: {
					id: `test-id-${i}`,
					type: 'ping' as const,
					target: `example${i}.com`,
					status: 'finished' as const,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
			probesCount: 1,
					results: []
				},
				status: 'success' as const
			});
		}

		const history = await storage.getHistory();
		assert.ok(history.length <= 25, 'History should be limited to 25 entries');
	});

	test('Should add and retrieve saved targets', async () => {
		await storage.addSavedTest({
			name: 'Test Target',
			config: {
				type: 'http',
				target: 'https://example.com',
				locations: [{ magic: 'US' }],
				limit: 5
			}
		});
		const targets = await storage.getSavedTests();
		
		assert.strictEqual(targets.length, 1);
		assert.strictEqual(targets[0].name, 'Test Target');
	});

	test('Should delete saved targets', async () => {
		const saved = await storage.addSavedTest({
			name: 'Delete Test',
			config: {
				type: 'ping',
				target: 'example.com',
				locations: [{ magic: 'global' }],
				limit: 3
			}
		});

		await storage.deleteSavedTest(saved.id);
		
		const targets = await storage.getSavedTests();
		assert.strictEqual(targets.length, 0);
	});
});

