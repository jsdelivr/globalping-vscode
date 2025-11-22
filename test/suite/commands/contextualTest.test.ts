/**
 * ContextualTest Command Tests
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { ContextualTestHandler } from '../../../src/commands/contextualTest';
import { TestRunner } from '../../../src/commands/testRunner';
import { TargetParser } from '../../../src/parsers/targetParser';
import { ConfigService } from '../../../src/services/config';
import { TestRunnerViewProvider } from '../../../src/views/testRunnerViewProvider';
import { createMockExtensionContext } from '../helpers/mockHelpers';

interface HandlerContext {
	handler: ContextualTestHandler;
	getRunnerArgs: () => any;
	parser: TargetParser;
	config: ConfigService;
}

const defaultParseResult = {
	isValid: true,
	target: 'example.com',
	isLocalhost: false,
	isPrivateIp: false
};

function createHandler(parseResult = defaultParseResult): HandlerContext {
	const context = createMockExtensionContext();
	const config = new ConfigService(context);
	let runnerExecuteArgs: any;

	const runnerStub = {
		executeAndShowResults: async (testConfig: any) => {
			runnerExecuteArgs = testConfig;
		}
	} as unknown as TestRunner;

	const parserStub = new TargetParser();
	(parserStub as any).parse = () => parseResult;

	// Mock TestRunnerViewProvider
	const testRunnerViewProviderStub = {
		loadTestIntoForm: () => { /* no-op for tests */ }
	} as unknown as TestRunnerViewProvider;

	return {
		handler: new ContextualTestHandler(runnerStub, parserStub, config, testRunnerViewProviderStub),
		getRunnerArgs: () => runnerExecuteArgs,
		parser: parserStub,
		config
	};
}

let lastError: string | undefined;
let lastWarning: string | undefined;
let lastInfo: string | undefined;
let originalError: typeof vscode.window.showErrorMessage;
let originalWarning: typeof vscode.window.showWarningMessage;
let originalInfo: typeof vscode.window.showInformationMessage;
let originalOpenExternal: typeof vscode.env.openExternal;

suiteSetup(() => {
	originalError = vscode.window.showErrorMessage;
	originalWarning = vscode.window.showWarningMessage;
	originalInfo = vscode.window.showInformationMessage;
	originalOpenExternal = vscode.env.openExternal;

	(vscode.window as any).showErrorMessage = async (message: string) => {
		lastError = message;
		return undefined;
	};
	(vscode.window as any).showWarningMessage = async (message: string) => {
		lastWarning = message;
		return undefined;
	};
	(vscode.window as any).showInformationMessage = async (message: string) => {
		lastInfo = message;
		return undefined;
	};
	(vscode.env as any).openExternal = async () => true;
});

suiteTeardown(() => {
	vscode.window.showErrorMessage = originalError;
	vscode.window.showWarningMessage = originalWarning;
	vscode.window.showInformationMessage = originalInfo;
	vscode.env.openExternal = originalOpenExternal;
});

function createEditor(selectedText: string): vscode.TextEditor {
	return {
		document: {
			getText: () => selectedText
		},
		selection: {} as vscode.Selection
	} as vscode.TextEditor;
}

suite('ContextualTestHandler', () => {
	setup(() => {
		lastError = undefined;
		lastWarning = undefined;
		lastInfo = undefined;
	});

	test('registerCommands registers five editor commands', () => {
		const context = createMockExtensionContext();
		const handlerCtx = createHandler();

		handlerCtx.handler.registerCommands(context);
		assert.strictEqual(context.subscriptions.length, 5);
	});

	test('handleContextTest executes test with parsed target', async () => {
		const handlerCtx = createHandler({ ...defaultParseResult, target: 'example.org' });
		await handlerCtx.handler.handleContextTest('ping', createEditor('example.org'));

		const executeArgs = handlerCtx.getRunnerArgs();
		assert.ok(executeArgs, 'execute should be called');
		assert.strictEqual(executeArgs.target, 'example.org');
	});

	test('handleContextTest shows error when no editor', async () => {
		const handlerCtx = createHandler();
		await handlerCtx.handler.handleContextTest('ping', undefined);
		assert.strictEqual(lastError, 'No active editor');
	});

	test('handleContextTest warns when selection empty', async () => {
		const handlerCtx = createHandler();
		await handlerCtx.handler.handleContextTest('ping', createEditor(''));
		assert.strictEqual(lastError, 'Please select a target (URL, domain, or IP address)');
	});

	test('handleContextTest warns on localhost selection', async () => {
		const handlerCtx = createHandler({
			...defaultParseResult,
			isValid: false,
			isLocalhost: true,
			isPrivateIp: false
		});

		await handlerCtx.handler.handleContextTest('ping', createEditor('localhost'));
		assert.ok(lastWarning?.includes('Cannot test localhost'));
	});

	test('handleContextTest rejects private IPs', async () => {
		const handlerCtx = createHandler({
			...defaultParseResult,
			isValid: false,
			isLocalhost: false,
			isPrivateIp: true
		});

		await handlerCtx.handler.handleContextTest('ping', createEditor('192.168.0.1'));
		assert.strictEqual(lastError, 'Cannot test private IP addresses from external probes');
	});

	test('handleContextTest rejects invalid targets', async () => {
		const handlerCtx = createHandler({
			...defaultParseResult,
			isValid: false,
			isLocalhost: false,
			isPrivateIp: false
		});

		await handlerCtx.handler.handleContextTest('ping', createEditor('???'));
		assert.ok(lastError?.includes('Cannot parse'));
	});
});
