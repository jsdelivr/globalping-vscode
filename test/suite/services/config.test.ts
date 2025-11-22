/**
 * Tests for ConfigService
 * 
 * Tests configuration management and default values.
 * Focus: Configuration defaults (token tests in commands/tokenManagement.test.ts)
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigService } from '../../../src/services/config';

suite('ConfigService Test Suite', () => {
	let mockContext: vscode.ExtensionContext;
	let config: ConfigService;

	setup(() => {
		// Create mock extension context
		mockContext = {
			globalState: {
				get: () => undefined,
				update: () => Promise.resolve(),
				keys: () => []
			},
			workspaceState: {
				get: () => undefined,
				update: () => Promise.resolve(),
				keys: () => []
			},
			secrets: {
				get: () => Promise.resolve(undefined),
				store: () => Promise.resolve(),
				delete: () => Promise.resolve()
			},
			subscriptions: [],
			extensionPath: '',
			extensionUri: vscode.Uri.parse('file:///test'),
			storagePath: '',
			globalStoragePath: '',
			logPath: '',
			extensionMode: vscode.ExtensionMode.Production,
			extension: {} as any,
			environmentVariableCollection: {} as any,
			globalStorageUri: vscode.Uri.parse('file:///test'),
			logUri: vscode.Uri.parse('file:///test'),
			storageUri: vscode.Uri.parse('file:///test')
		} as any;

		config = new ConfigService(mockContext);
	});

	test('getConfig returns default world location', () => {
		const appConfig = config.getConfig();
		assert.strictEqual(appConfig.defaultLocation, 'world');
	});

	test('getConfig returns default limit of 3', () => {
		const appConfig = config.getConfig();
		assert.strictEqual(appConfig.defaultLimit, 3);
	});

	test('getConfig returns default inProgressUpdates as true', () => {
		const appConfig = config.getConfig();
		assert.strictEqual(appConfig.inProgressUpdates, true);
	});

	test('getConfig returns default rawResults as false', () => {
		const appConfig = config.getConfig();
		assert.strictEqual(appConfig.rawResults, false);
	});

	test('getAuthToken returns undefined when no token stored', async () => {
		const token = await config.getAuthToken();
		assert.strictEqual(token, undefined);
	});

	test('setAuthToken and getAuthToken work together', async () => {
		const testToken = 'test-token-12345';
		
		// Override secrets store/get for testing
		let storedToken: string | undefined;
		mockContext.secrets.store = async (_key: string, value: string) => {
			storedToken = value;
		};
		mockContext.secrets.get = async (_key: string) => {
			return Promise.resolve(storedToken);
		};

		await config.setAuthToken(testToken);
		const token = await config.getAuthToken();
		
		assert.strictEqual(token, testToken);
	});
});
