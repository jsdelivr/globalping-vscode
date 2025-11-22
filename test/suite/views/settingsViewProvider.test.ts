/**
 * SettingsViewProvider (Authentication Panel) Tests
 * 
 * Tests the Authentication panel webview functionality.
 * Focus: Provider behavior and rate limits (avoiding brittle HTML assertions)
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { SettingsViewProvider } from '../../../src/views/settingsViewProvider';
import { ConfigService } from '../../../src/services/config';
import { GlobalpingClient } from '../../../src/services/globalpingClient';
import { TelemetryService } from '../../../src/services/telemetry';
import { createMockGlobalpingConstructor, installMockGlobalping, restoreMockGlobalping } from '../helpers/mockHelpers';

suite('SettingsViewProvider (Authentication Panel) Tests', () => {
	let mockContext: vscode.ExtensionContext;
	let provider: SettingsViewProvider;
	let config: ConfigService;
	let client: GlobalpingClient;
	let telemetry: TelemetryService;
	let mockWebviewView: any;
	let postedMessages: any[];
	let originalGlobalping: any;

	suiteSetup(() => {
		// Mock Globalping library BEFORE any tests run
		const mockConstructor = createMockGlobalpingConstructor({
			customResponses: {
				limits: {
					rateLimit: {
						measurements: {
							create: {
								type: 'ip',
								remaining: 100,
								limit: 500,
								reset: Date.now() / 1000 + 3600
							}
						}
					},
					credits: {
						remaining: 50000  // Mock credits for authenticated users
					}
				}
			}
		});
		originalGlobalping = installMockGlobalping(mockConstructor);
	});

	suiteTeardown(() => {
		// Restore original Globalping library after all tests
		restoreMockGlobalping(originalGlobalping);
	});

	setup(() => {
		postedMessages = [];

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
				get: async (key: string) => {
					if (key === 'globalping.authToken') {
						return undefined; // No token by default
					}
					return undefined;
				},
				store: async (key: string, value: string) => Promise.resolve(),
				delete: async (key: string) => Promise.resolve()
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

		// Initialize services
		telemetry = new TelemetryService();
		config = new ConfigService(mockContext);
		client = new GlobalpingClient(telemetry, config, '1.0.0');

		// Create mock webview view
		mockWebviewView = {
			webview: {
				options: {},
				html: '',
				postMessage: async (message: any) => {
					postedMessages.push(message);
					return true;
				},
				asWebviewUri: (uri: vscode.Uri) => uri,
				onDidReceiveMessage: (callback: any) => {
					return { dispose: () => { } };
				}
			},
			visible: true,
			onDidDispose: (callback: any) => {
				return { dispose: () => { } };
			},
			onDidChangeVisibility: (callback: any) => {
				return { dispose: () => { } };
			}
		};

		// Create provider
		provider = new SettingsViewProvider(
			mockContext.extensionUri,
			config,
			client
		);
	});

	test('Provider has correct viewType', () => {
		assert.strictEqual(SettingsViewProvider.viewType, 'globalping.authentication');
	});

	test('Provider resolves webview view', () => {
		const token: vscode.CancellationToken = {
			isCancellationRequested: false,
			onCancellationRequested: () => ({ dispose: () => { } })
		};

		// Should not throw
		assert.doesNotThrow(() => {
			provider.resolveWebviewView(mockWebviewView, {} as any, token);
		});
	});

	test('Should fetch and post rate limits on load', async () => {
		// Wait for client initialization first
		await (client as any).initializationPromise;

		const token: vscode.CancellationToken = {
			isCancellationRequested: false,
			onCancellationRequested: () => ({ dispose: () => { } })
		};

		provider.resolveWebviewView(mockWebviewView, {} as any, token);

		// Wait for refresh to complete (increased timeout for async operations)
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Check that postMessage was called with rate limit data
		const statusMessages = postedMessages.filter(msg => msg.command === 'updateStatus');
		assert.ok(statusMessages.length > 0, 'Should post updateStatus message');

		const latestStatus = statusMessages[statusMessages.length - 1];
		assert.ok(latestStatus.limits, 'Status should include limits');
	});

	test('Refresh should update rate limits from API', async () => {
		let callCount = 0;

		// Wait for client initialization
		await (client as any).initializationPromise;

		const originalGetLimits = client.getRateLimits.bind(client);
		(client as any).getRateLimits = async () => {
			callCount++;
			return {
				remaining: 100 - callCount,
				limit: 500,
				reset: new Date(Date.now() + 3600000),
				isAuthenticated: false
			};
		};

		const token: vscode.CancellationToken = {
			isCancellationRequested: false,
			onCancellationRequested: () => ({ dispose: () => { } })
		};

		provider.resolveWebviewView(mockWebviewView, {} as any, token);

		// Wait for initial load (500ms + buffer)
		await new Promise(resolve => setTimeout(resolve, 600));
		const initialCallCount = callCount;

		// Clear previous messages
		postedMessages.length = 0;

		// Call refresh again
		await provider.refresh();

		// Should have made another API call
		assert.ok(callCount > initialCallCount, 'getRateLimits should be called again on refresh');

		// Check that new data was posted
		const statusMessages = postedMessages.filter(msg => msg.command === 'updateStatus');
		assert.ok(statusMessages.length > 0, 'Should post updated status');

		// Restore
		(client as any).getRateLimits = originalGetLimits;
	});
});
