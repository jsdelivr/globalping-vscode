/**
 * Contextual Test Handler
 * 
 * Handles right-click context menu test commands.
 */

import * as vscode from 'vscode';
import { TestRunner } from './testRunner';
import { TargetParser } from '../parsers/targetParser';
import { MeasurementType } from 'globalping';
import { ConfigService } from '../services/config';
import { TestConfigBuilder } from '../services/testConfigBuilder';
import { registerCommandOnce } from '../utils/commandRegistry';
import { MeasurementBuilder } from '../services/measurementBuilder';
import { COMMANDS, MESSAGES, URLS } from '../constants';
import { TestRunnerViewProvider } from '../views/testRunnerViewProvider';

export class ContextualTestHandler {
	private measurementBuilder = new MeasurementBuilder();

	constructor(
		private testRunner: TestRunner,
		private targetParser: TargetParser,
		private config: ConfigService,
		private testRunnerViewProvider: TestRunnerViewProvider
	) {}

	/**
	 * Handle context menu test command
	 */
	public async handleContextTest(
		testType: MeasurementType,
		editor?: vscode.TextEditor
	): Promise<void> {
		if (!editor) {
			vscode.window.showErrorMessage(MESSAGES.ERRORS.NO_ACTIVE_EDITOR);
			return;
		}

		const selection = editor.document.getText(editor.selection);

		if (!selection) {
			vscode.window.showErrorMessage(MESSAGES.ERRORS.NO_SELECTION);
			return;
		}

		// Parse selected text
		const parseResult = this.targetParser.parse(selection);

		if (!parseResult.isValid) {
			if (parseResult.isLocalhost) {
				const action = await vscode.window.showWarningMessage(
					MESSAGES.ERRORS.LOCALHOST_NOT_TESTABLE,
					MESSAGES.ACTIONS.LEARN_MORE,
					MESSAGES.ACTIONS.CANCEL
				);

				if (action === MESSAGES.ACTIONS.LEARN_MORE) {
					vscode.env.openExternal(
						vscode.Uri.parse(URLS.TESTING_LOCALHOST_DOCS)
					);
				}
				return;
			}

			if (parseResult.isPrivateIp) {
				vscode.window.showErrorMessage(
					MESSAGES.ERRORS.PRIVATE_IP_NOT_TESTABLE
				);
				return;
			}

			vscode.window.showErrorMessage(
				MESSAGES.ERRORS.INVALID_TARGET(selection)
			);
			return;
		}

		// Get configuration
		const appConfig = this.config.getConfig();

		// Build measurement configuration using centralized builder
		let testConfig;
		try {
			const { target, measurementOptions } = this.measurementBuilder.buildConfig(
				parseResult.target,
				testType,
				appConfig.defaultHttpProtocol
			);

			testConfig = new TestConfigBuilder()
				.withType(testType)
				.withTarget(target)
				.withLocations(appConfig.defaultLocation)
				.withLimit(appConfig.defaultLimit)
				.withInProgressUpdates(appConfig.inProgressUpdates)
				.withMeasurementOptions(measurementOptions)
				.build();
		} catch (error: any) {
			vscode.window.showErrorMessage(error.message || MESSAGES.ERRORS.INVALID_TARGET_GENERIC);
			return;
		}

		// Pre-fill the Test Runner sidebar with the test configuration
		this.testRunnerViewProvider.loadTestIntoForm(testConfig);

		// Execute test
		await this.testRunner.executeAndShowResults(testConfig);
	}

	/**
	 * Register all context menu commands
	 */
	public registerCommands(context: vscode.ExtensionContext): void {
		const register = (commandId: string, type: MeasurementType) => {
			registerCommandOnce(
				context,
				commandId,
				(editor: vscode.TextEditor) => this.handleContextTest(type, editor),
				{ editor: true }
			);
		};

		register(COMMANDS.CONTEXT_TEST_PING, 'ping');
		register(COMMANDS.CONTEXT_TEST_HTTP, 'http');
		register(COMMANDS.CONTEXT_TEST_DNS, 'dns');
		register(COMMANDS.CONTEXT_TEST_TRACEROUTE, 'traceroute');
		register(COMMANDS.CONTEXT_TEST_MTR, 'mtr');
	}
}

