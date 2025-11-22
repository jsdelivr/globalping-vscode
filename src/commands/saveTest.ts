/**
 * Save Test Command
 *
 * Handles saving test configurations as favorites for quick re-running.
 */

import * as vscode from 'vscode';
import { StorageService } from '../services/storage';
import { TestConfig } from '../types/measurement';
import { SavedTestsTreeProvider } from '../views/sidebar/savedTestsTreeProvider';
import { registerCommandOnce } from '../utils/commandRegistry';
import { COMMANDS, MESSAGES } from '../constants';

export class SaveTestCommand {
	constructor(
		private storage: StorageService,
		private savedTestsProvider: SavedTestsTreeProvider
	) {}

	/**
	 * Save a test configuration as a favorite
	 */
	public async saveTest(config: TestConfig): Promise<void> {
		// Prompt for a name
		if ('type' in config) {
			const name = await vscode.window.showInputBox({
				prompt: MESSAGES.PROMPTS.SAVE_TEST_NAME,
				placeHolder: MESSAGES.PROMPTS.SAVE_TEST_PLACEHOLDER(config.type, config.target),
				title: MESSAGES.PROMPTS.SAVE_TEST_TITLE,
				validateInput: (value) => {
					if (!value || value.trim().length === 0) {
						return MESSAGES.VALIDATION.NAME_REQUIRED;
					}
					if (value.trim().length > 50) {
						return MESSAGES.VALIDATION.NAME_TOO_LONG;
					}
					return undefined;
				}
			});

			if (!name) {
				return; // User cancelled
			}

			try {
				await this.storage.addSavedTest({
					name: name.trim(),
					config
				});

				// Refresh the saved tests view
				this.savedTestsProvider.refresh();

				vscode.window.showInformationMessage(MESSAGES.SUCCESS.TEST_SAVED(name.trim()));
			} catch (error: any) {
				vscode.window.showErrorMessage(MESSAGES.ERRORS.SAVE_FAILED(error.message));
			}
		}
	}

	/**
	 * Register command
	 */
	public registerCommand(context: vscode.ExtensionContext): void {
		registerCommandOnce(
			context,
			COMMANDS.SAVE_TEST,
			async (config?: TestConfig) => {
				if (!config) {
					// Try to get last test from history
					const lastEntry = await this.storage.getLastHistoryEntry();
					if (lastEntry) {
						await this.saveTest(lastEntry.config);
					} else {
						vscode.window.showInformationMessage(MESSAGES.SUCCESS.NO_TEST_TO_SAVE);
					}
				} else {
					await this.saveTest(config);
				}
			}
		);
	}
}

