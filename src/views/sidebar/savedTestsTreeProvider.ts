/**
 * Saved Tests TreeView Provider
 *
 * Displays saved tests in the sidebar for quick loading into the test runner form.
 */

import * as vscode from 'vscode';
import { StorageService } from '../../services/storage';
import { SavedTest } from '../../types/measurement';
import { TestRunner } from '../../commands/testRunner';
import { TestRunnerViewProvider } from '../testRunnerViewProvider';
import { registerCommandOnce } from '../../utils/commandRegistry';

export class SavedTestsTreeProvider implements vscode.TreeDataProvider<SavedTestTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<SavedTestTreeItem | undefined | null> =
		new vscode.EventEmitter<SavedTestTreeItem | undefined | null>();
	readonly onDidChangeTreeData: vscode.Event<SavedTestTreeItem | undefined | null> =
		this._onDidChangeTreeData.event;

	constructor(
		private storage: StorageService,
		private testRunner: TestRunner,
		private testRunnerProvider: TestRunnerViewProvider
	) {}

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element: SavedTestTreeItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: SavedTestTreeItem): Promise<SavedTestTreeItem[]> {
		if (element) {
			return [];
		}

		const tests = await this.storage.getSavedTests();

		if (tests.length === 0) {
			return [];
		}

		return tests.map(test => new SavedTestTreeItem(test, this.testRunner, this.storage, this));
	}

	/**
	 * Register commands
	 */
	public registerCommands(context: vscode.ExtensionContext): void {
		registerCommandOnce(
			context,
			'globalping.loadSavedTest',
			async (item: SavedTestTreeItem) => {
				// Load test into form instead of running immediately (Postman-style)
				this.testRunnerProvider.loadTestIntoForm(item.test.config);
				vscode.window.showInformationMessage(`Loaded "${item.test.name}" into Test Runner`);
			}
		);
		registerCommandOnce(
			context,
			'globalping.deleteSavedTest',
			async (item: SavedTestTreeItem) => {
				await this.storage.deleteSavedTest(item.test.id);
				this.refresh();
				vscode.window.showInformationMessage(`Deleted "${item.test.name}"`);
			}
		);
	}
}

class SavedTestTreeItem extends vscode.TreeItem {
	constructor(
		public readonly test: SavedTest,
		private testRunner: TestRunner,
		private storage: StorageService,
		private provider: SavedTestsTreeProvider
	) {
		super(test.name, vscode.TreeItemCollapsibleState.None);

		if ('type' in test.config) {
			// Icon based on test type
			const iconMap: Record<string, string> = {
				ping: 'pulse',
				http: 'globe',
				dns: 'symbol-namespace',
				traceroute: 'git-branch',
				mtr: 'layers'
			};
			this.iconPath = new (vscode.ThemeIcon as any)(iconMap[test.config.type] || 'star');

			// Description
			this.description = `${test.config.type} - ${test.config.target}`;

			// Tooltip
			const tooltip = new vscode.MarkdownString();
			tooltip.appendMarkdown(`**${test.name}**\n\n`);
			tooltip.appendMarkdown(`Type: ${test.config.type}\n\n`);
			tooltip.appendMarkdown(`Target: \`${test.config.target}\`\n\n`);
			if (Array.isArray(test.config.locations)) {
				// Extract 'magic' property from location objects
				const locationStrings = test.config.locations.map(loc => loc.magic || String(loc));
				tooltip.appendMarkdown(`Location: ${locationStrings.join(', ')}\n\n`);
			} else if (test.config.locations) {
				tooltip.appendMarkdown(`Location: ${test.config.locations}\n\n`);
			}
			tooltip.appendMarkdown(`Probes: ${test.config.limit}`);
			this.tooltip = tooltip as any; // MarkdownString is valid but type may be strict
		}

		// Context value
		this.contextValue = 'savedTest';

		// Command to load test
		this.command = {
			command: 'globalping.loadSavedTest',
			title: 'Load Test',
			arguments: [this]
		};
	}
}

