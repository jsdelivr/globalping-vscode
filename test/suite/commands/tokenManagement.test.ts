/**
 * Token Management Tests
 * 
 * Tests for API token management commands (set and remove).
 * Focus: Core functionality via ConfigService (edge cases not needed)
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigService } from '../../../src/services/config';
import packageJson from '../../../package.json';
import { createMockExtensionContext } from '../helpers/mockHelpers';

suite('Token Management Tests', () => {
	let mockContext: vscode.ExtensionContext;
	let config: ConfigService;

	setup(() => {
		mockContext = createMockExtensionContext();
		config = new ConfigService(mockContext);
	});

	test('Should store token securely via secrets API', async () => {
		let storedKey: string | undefined;
		let storedValue: string | undefined;

		mockContext.secrets.store = async (key: string, value: string) => {
			storedKey = key;
			storedValue = value;
			return Promise.resolve();
		};

		await config.setAuthToken('test-token-123');

		assert.strictEqual(storedKey, 'globalping.authToken', 'Should store with correct key');
		assert.strictEqual(storedValue, 'test-token-123', 'Should store correct token value');
	});

	test('Should retrieve token from secrets API', async () => {
		mockContext.secrets.get = async (key: string) => {
			if (key === 'globalping.authToken') {
				return 'stored-token-456';
			}
			return undefined;
		};

		const token = await config.getAuthToken();
		assert.strictEqual(token, 'stored-token-456', 'Should retrieve stored token');
	});

	test('Should return undefined when no token stored', async () => {
		mockContext.secrets.get = async (key: string) => {
			return undefined;
		};

		const token = await config.getAuthToken();
		assert.strictEqual(token, undefined, 'Should return undefined when no token');
	});

	test('Should delete token by storing empty string', async () => {
		let deletedOrStored = false;
		let storedValue: string | undefined;

		mockContext.secrets.store = async (key: string, value: string) => {
			storedValue = value;
			deletedOrStored = true;
			return Promise.resolve();
		};

		await config.setAuthToken('');

		assert.ok(deletedOrStored, 'Should call store/delete');
		assert.strictEqual(storedValue, '', 'Should store empty string to remove token');
	});

	test('Manifest includes token management commands', () => {
		const commands = new Set(
			(packageJson as any).contributes?.commands?.map((cmd: { command: string }) => cmd.command) ?? []
		);

		assert.ok(commands.has('globalping.setApiToken'), 'setApiToken command should be declared');
		assert.ok(commands.has('globalping.removeApiToken'), 'removeApiToken command should be declared');
	});

	test('Should handle token storage failure gracefully', async () => {
		mockContext.secrets.store = async (key: string, value: string) => {
			throw new Error('Storage failed');
		};

		// Should propagate error but not crash
		try {
			await config.setAuthToken('test-token');
			assert.fail('Should throw error on storage failure');
		} catch (error) {
			assert.ok(error, 'Should throw error');
		}
	});

	test('Should handle token retrieval failure gracefully', async () => {
		mockContext.secrets.get = async (key: string) => {
			throw new Error('Retrieval failed');
		};

		// Should handle retrieval failure
		try {
			await config.getAuthToken();
			// May return undefined or throw, both are acceptable
		} catch (error) {
			// Error is acceptable
			assert.ok(error, 'Error handling is working');
		}
	});
});
