/**
 * Run Last Test Command
 * 
 * Re-runs the most recent test from history.
 */

import * as vscode from 'vscode';
import { TestRunner } from './testRunner';
import { StorageService } from '../services/storage';
import { registerCommandOnce } from '../utils/commandRegistry';
import { COMMANDS, MESSAGES } from '../constants';

export class RunLastTestCommand {
	constructor(
		private testRunner: TestRunner,
		private storage: StorageService
	) {}

	/**
	 * Re-run the last test
	 */
	public async execute(): Promise<void> {
		try {
			const lastEntry = await this.storage.getLastHistoryEntry();

			if (!lastEntry) {
				vscode.window.showInformationMessage(MESSAGES.ERRORS.NO_PREVIOUS_TESTS);
				return;
			}

			// Confirm with user
			if ('type' in lastEntry.config) {
				const action = await vscode.window.showInformationMessage(
					MESSAGES.PROMPTS.CONFIRM_RERUN(lastEntry.config.type, lastEntry.config.target),
					MESSAGES.ACTIONS.YES,
					MESSAGES.ACTIONS.NO
				);

				if (action !== MESSAGES.ACTIONS.YES) {
					return;
				}
			}

			// Execute test
			await this.testRunner.executeAndShowResults(lastEntry.config);
		} catch (error: any) {
			vscode.window.showErrorMessage(MESSAGES.ERRORS.RERUN_FAILED(error.message));
		}
	}

	/**
	 * Register command
	 */
	public registerCommand(context: vscode.ExtensionContext): void {
		registerCommandOnce(
			context,
			COMMANDS.RUN_LAST_TEST,
			() => this.execute()
		);
	}
}

