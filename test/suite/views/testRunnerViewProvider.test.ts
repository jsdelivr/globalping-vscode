/**
 * TestRunnerViewProvider Tests
 * 
 * Tests the Test Runner webview functionality.
 * Focus: Provider creation and viewType (avoiding brittle HTML assertions)
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { TestRunnerViewProvider } from '../../../src/views/testRunnerViewProvider';
import { createMockExtensionContext, setupMockGlobalping } from '../helpers/mockHelpers';
import { ConfigService } from '../../../src/services/config';
import { StorageService } from '../../../src/services/storage';
import { TelemetryService } from '../../../src/services/telemetry';

suite('TestRunnerViewProvider Tests', () => {
	let provider: TestRunnerViewProvider;
	let config: ConfigService;
	let storage: StorageService;
	let mockContext: vscode.ExtensionContext;
	let cleanupMock: (() => void) | null = null;
	const telemetryInstances: TelemetryService[] = [];
	const storageInstances: StorageService[] = [];

	setup(() => {
		// Setup Globalping mock before any initialization
		cleanupMock = setupMockGlobalping({});
		
		// Create lightweight mocks
		mockContext = createMockExtensionContext();
		const telemetry = new TelemetryService();
		telemetryInstances.push(telemetry);
		config = new ConfigService(mockContext);
		storage = new StorageService(mockContext);
		storageInstances.push(storage);

		// Create lightweight stubs for heavy dependencies
		const stubClient: any = {
			createMeasurement: async () => ({ id: 'test', type: 'ping', status: 'finished' }),
			getRateLimits: async () => ({ limit: 100, remaining: 95, reset: new Date(), isAuthenticated: false })
		};
		const stubOutputChannel: any = {
			showResults: () => {}
		};
		const stubTestRunner: any = {
			runTest: async () => {}
		};
		const stubSavedTargets: any = {
			getSavedTargets: () => []
		};

		// Create provider with stubs
		provider = new TestRunnerViewProvider(
			mockContext.extensionUri,
			stubTestRunner,
			config,
			storage,
			stubSavedTargets
		);
	});

	teardown(() => {
		// Cleanup mocks
		if (cleanupMock) {
			cleanupMock();
			cleanupMock = null;
		}
		
		// Cleanup service instances
		while (telemetryInstances.length) {
			telemetryInstances.pop()?.dispose();
		}
		storageInstances.length = 0;
	});

	test('Provider has correct viewType', () => {
		assert.strictEqual(TestRunnerViewProvider.viewType, 'globalping.testRunner');
	});

	test('Provider generates HTML without errors', () => {
		// Access the private method through reflection
		const html = (provider as any)._getHtmlForWebview({ asWebviewUri: (uri: vscode.Uri) => uri });

		// Just verify HTML is generated without error
		assert.ok(html, 'Should generate HTML');
		assert.ok(html.length > 0, 'HTML should not be empty');
		assert.ok(typeof html === 'string', 'HTML should be a string');
	});
});
