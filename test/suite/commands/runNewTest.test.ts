/**
 * Run New Test Command Tests
 * 
 * Tests for the "Run New Test" command that users invoke from Command Palette.
 * These tests verify the multi-step flow works correctly.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { RunNewTestCommand } from '../../../src/commands/runNewTest';
import { ConfigService } from '../../../src/services/config';
import { createMockExtensionContext } from '../helpers/mockHelpers';
import { TestDisposables } from '../helpers/testDisposables';

suite('Run New Test Command', () => {
	const disposables = new TestDisposables();

	teardown(() => {
		disposables.disposeAll();
	});

	test('registerCommand registers command handler', () => {
		const registered: Array<{ id: string; handler: () => void }> = [];
		const mockRegister = (commandId: string, handler: () => void) => {
			registered.push({ id: commandId, handler });
			const disposable = new vscode.Disposable(() => {});
			disposables.track(disposable);
			return disposable;
		};

		const mockRunner = {
			executeAndShowResults: async () => {}
		} as any;

		const configService = new ConfigService(createMockExtensionContext());
		const command = new RunNewTestCommand(mockRunner, configService, mockRegister);
		const context = createMockExtensionContext();

		command.registerCommand(context);

		assert.ok(
			registered.some(entry => entry.id === 'globalping.runNewTest'),
			'globalping.runNewTest should be registered'
		);
		assert.ok(
			context.subscriptions.length > 0,
			'Disposable should be added to context subscriptions'
		);
	});
});

