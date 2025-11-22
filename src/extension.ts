/**
 * Globalping VS Code Extension
 * Entry point for the extension
 */

import * as vscode from 'vscode';
import { ConfigService } from './services/config';
import { TelemetryService } from './services/telemetry';
import { StorageService } from './services/storage';
import { GlobalpingClient } from './services/globalpingClient';
import { TestRunner } from './commands/testRunner';
import { ContextualTestHandler } from './commands/contextualTest';
import { RunNewTestCommand } from './commands/runNewTest';
import { RunLastTestCommand } from './commands/runLastTest';
import { SaveTestCommand } from './commands/saveTest';
import { HistoryTreeProvider } from './views/sidebar/historyTreeProvider';
import { SavedTestsTreeProvider } from './views/sidebar/savedTestsTreeProvider';
import { StatusBarManager } from './views/statusBar';
import { ResultsDocumentProvider } from './views/resultsDocumentProvider';
import { OutputChannelResultsDisplay } from './views/outputChannelResultsDisplay';
import { TestRunnerViewProvider } from './views/testRunnerViewProvider';
import { SettingsViewProvider } from './views/settingsViewProvider';
import { TargetParser } from './parsers/targetParser';
import { COMMANDS, MESSAGES, VIEWS } from './constants';
import * as ui from './utils/ui';

// Extension version
const EXTENSION_VERSION = '1.0.0';

/**
 * Extension activation function
 * Called when the extension is activated
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
	// Initialize services
	const config = new ConfigService(context);
	const telemetry = new TelemetryService();
	const storage = new StorageService(context);
	const client = new GlobalpingClient(telemetry, config, EXTENSION_VERSION);
	const targetParser = new TargetParser();

	// Initialize status bar
	const statusBar = new StatusBarManager();
	context.subscriptions.push(statusBar);

	// Initialize output channel for results
	const outputChannel = new OutputChannelResultsDisplay();
	context.subscriptions.push(outputChannel);

	// Initialize test runner
	const testRunner = new TestRunner(client, storage, telemetry, config, outputChannel);

	// Initialize results document provider
	const resultsProvider = ResultsDocumentProvider.register(context);

	// Wrap test runner to update status bar and results provider
	const originalExecuteAndShowResults = testRunner.executeAndShowResults.bind(testRunner);
	const originalShowResults = testRunner.showResults.bind(testRunner);
	
	// Override showResults to use results provider
	testRunner.showResults = async (measurement: any, _resultsProvider?: any, raw?: boolean) => {
		return originalShowResults(measurement, resultsProvider, raw);
	};
	
	// Initialize settings webview provider (before wrapping testRunner)
	const settingsViewProvider = new SettingsViewProvider(
		context.extensionUri,
		config,
		client
	);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			SettingsViewProvider.viewType,
			settingsViewProvider,
			{
				webviewOptions: {
					retainContextWhenHidden: true
				}
			}
		)
	);

	testRunner.executeAndShowResults = async (testConfig, token, rawResults) => {
		statusBar.updateRunning(testConfig.target);

		try {
			await originalExecuteAndShowResults(testConfig, token, rawResults);
			
			// Get last result from storage
			const lastEntry = await storage.getLastHistoryEntry();
			if (lastEntry) {
				statusBar.updateCompleted(lastEntry.result);
				resultsProvider.storeMeasurement(lastEntry.result);
			}
			
			// Refresh settings view to update rate limits after successful test
			await settingsViewProvider.refresh();
		} catch (error) {
			statusBar.updateIdle();
			// Still refresh settings view on error to show updated rate limits
			await settingsViewProvider.refresh();
			throw error;
		}
	};

	// Initialize TreeView providers
	const historyProvider = new HistoryTreeProvider(storage, testRunner);
	const historyTreeView = vscode.window.createTreeView(VIEWS.HISTORY, {
		treeDataProvider: historyProvider
	});
	context.subscriptions.push(historyTreeView);

	// Register test runner webview provider first
	const testRunnerViewProvider = new TestRunnerViewProvider(
		context.extensionUri,
		testRunner,
		config,
		storage,
		() => {
			historyProvider.refresh(); // Refresh history when test completes
			void settingsViewProvider.refresh(); // Refresh rate limits and credits
		}
	);

	// Now create saved tests provider with testRunnerViewProvider
	const savedTestsProvider = new SavedTestsTreeProvider(storage, testRunner, testRunnerViewProvider);
	const savedTestsTreeView = vscode.window.createTreeView(VIEWS.SAVED_TESTS, {
		treeDataProvider: savedTestsProvider
	});
	context.subscriptions.push(savedTestsTreeView);

	// Set the saved tests provider on the test runner view provider
	testRunnerViewProvider.setSavedTestsProvider(savedTestsProvider);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			TestRunnerViewProvider.viewType,
			testRunnerViewProvider,
			{
				webviewOptions: {
					retainContextWhenHidden: true
				}
			}
		)
	);

	// Register tree view commands
	historyProvider.registerCommands(context);
	savedTestsProvider.registerCommands(context);

	// Initialize commands
	const contextualTestHandler = new ContextualTestHandler(testRunner, targetParser, config, testRunnerViewProvider);
	contextualTestHandler.registerCommands(context);

	const runNewTestCommand = new RunNewTestCommand(testRunner, config);
	runNewTestCommand.registerCommand(context);

	const runLastTestCommand = new RunLastTestCommand(testRunner, storage);
	runLastTestCommand.registerCommand(context);

	const saveTestCommand = new SaveTestCommand(storage, savedTestsProvider);
	saveTestCommand.registerCommand(context);

	// Register additional commands
	context.subscriptions.push(
		vscode.commands.registerCommand(COMMANDS.SHOW_OUTPUT_CHANNEL, () => {
			outputChannel.show();
		}),

		vscode.commands.registerCommand(COMMANDS.OPEN_LAST_RESULT, async () => {
			const lastEntry = await storage.getLastHistoryEntry();
			if (lastEntry) {
				await testRunner.showResults(lastEntry.result);
				outputChannel.show();
			} else {
				vscode.window.showInformationMessage(MESSAGES.ERRORS.NO_RESULTS);
			}
		}),

		vscode.commands.registerCommand(COMMANDS.OPEN_HISTORY_RESULT, async (entryOrItem: any) => {
			// Handle both direct entry and tree item
			const entry = entryOrItem.entry || entryOrItem;
			await testRunner.showResults(entry.result);
			outputChannel.show();
		}),

		vscode.commands.registerCommand(COMMANDS.RERUN_HISTORY_TEST, async (item: any) => {
			// Handle both direct entry and tree item
			const entry = item.entry || item;
			await testRunner.executeAndShowResults(entry.config);
			historyProvider.refresh();
		}),

		vscode.commands.registerCommand(COMMANDS.VIEW_HISTORY, async () => {
			await vscode.commands.executeCommand(`${VIEWS.HISTORY}.focus`);
		}),

		vscode.commands.registerCommand(COMMANDS.OPEN_SETTINGS, async () => {
			await vscode.commands.executeCommand(
				'workbench.action.openSettings',
				'@ext:globalping.globalping'
			);
		}),

		vscode.commands.registerCommand(COMMANDS.SET_API_TOKEN, async () => {
			const token = await vscode.window.showInputBox({
				prompt: MESSAGES.AUTH.ENTER_TOKEN,
				placeHolder: MESSAGES.AUTH.TOKEN_PLACEHOLDER,
				password: true,
				ignoreFocusOut: true,
				validateInput: (value) => {
					if (!value || value.trim().length === 0) {
						return MESSAGES.AUTH.TOKEN_EMPTY;
					}
					return null;
				}
			});

			if (token) {
				// Validate token before saving
				const validationMessage = await vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: 'Validating API token...',
					cancellable: false
				}, async () => {
					try {
						// Create temporary client with new token to test it
						const Globalping = (await import('globalping')).default;
						const testClient = new Globalping({
							auth: token.trim(),
							userAgent: `globalping-vscode/${EXTENSION_VERSION}`,
							throwApiErrors: false
						});

						// Test the token by calling getLimits()
						const response = await testClient.getLimits();

						if (!response.ok) {
							const status = response.response?.status;
							if (status === 401 || status === 403) {
								return { success: false, message: MESSAGES.AUTH.INVALID_TOKEN };
							}
							const errorData = response.data as any;
							return { success: false, message: MESSAGES.ERRORS.TOKEN_VALIDATION_FAILED(errorData?.error?.message || 'Unknown error') };
						}

						// Token is valid
						return { success: true, message: null };
					} catch (error: any) {
						telemetry.error('Token validation failed', error);
						return { success: false, message: MESSAGES.ERRORS.TOKEN_VALIDATION_FAILED(error.message || 'Network error') };
					}
				});

				if (!validationMessage.success) {
					const action = await vscode.window.showErrorMessage(
						`❌ ${validationMessage.message}`,
						MESSAGES.ACTIONS.GET_TOKEN,
						MESSAGES.ACTIONS.RETRY,
						MESSAGES.ACTIONS.CANCEL
					);

					if (action === MESSAGES.ACTIONS.GET_TOKEN) {
						ui.openTokenDashboard();
					} else if (action === MESSAGES.ACTIONS.RETRY) {
						// Re-run the command
						vscode.commands.executeCommand(COMMANDS.SET_API_TOKEN);
					}
					return;
				}

				// Token is valid, save it
				await config.setAuthToken(token);
				await client.reinitialize();

				// Refresh settings view
				await settingsViewProvider.refresh();

				const action = await vscode.window.showInformationMessage(
					MESSAGES.AUTH.TOKEN_SAVED,
					MESSAGES.ACTIONS.CHECK_LIMITS,
					MESSAGES.ACTIONS.OK
				);

				if (action === MESSAGES.ACTIONS.CHECK_LIMITS) {
					try {
						const limits = await client.getRateLimits();
						if (limits) {
							vscode.window.showInformationMessage(
								MESSAGES.RATE_LIMIT.INFO(limits.remaining, limits.limit)
							);
						}
					} catch {
						// Already validated, so this shouldn't fail, but handle gracefully
						vscode.window.showWarningMessage(MESSAGES.ERRORS.RATE_LIMITS_FETCH_FAILED);
					}
				}
			}
		}),

		vscode.commands.registerCommand(COMMANDS.REMOVE_API_TOKEN, async () => {
			const confirm = await vscode.window.showWarningMessage(
				MESSAGES.AUTH.CONFIRM_REMOVE,
				{ modal: true },  // Force modal dialog in all editors
				MESSAGES.ACTIONS.REMOVE,
				MESSAGES.ACTIONS.CANCEL
			);

			if (confirm === MESSAGES.ACTIONS.REMOVE) {
				await config.deleteAuthToken();
				await client.reinitialize();

				// Refresh settings view
				await settingsViewProvider.refresh();

				vscode.window.showInformationMessage(MESSAGES.AUTH.TOKEN_REMOVED);
			}
		})
	);

	// Listen for configuration changes
	context.subscriptions.push(
		config.onConfigChange((newConfig) => {
			telemetry.info('Configuration changed', { config: newConfig });
		})
	);

	// Add disposables
	context.subscriptions.push(telemetry);

	telemetry.info('Extension activated successfully', { version: EXTENSION_VERSION });
}

/**
 * Extension deactivation function
 * Called when the extension is deactivated
 */
export function deactivate(): void {
	// Extension cleanup handled by VS Code's disposal system
}
