/**
 * History TreeView Provider
 * 
 * Displays test history in the sidebar with visual status indicators.
 */

import * as vscode from 'vscode';
import { StorageService } from '../../services/storage';
import { TestHistoryEntry } from '../../types/measurement';
import { TestRunner } from '../../commands/testRunner';
import { registerCommandOnce } from '../../utils/commandRegistry';

export class HistoryTreeProvider implements vscode.TreeDataProvider<HistoryTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<HistoryTreeItem | undefined | null> = 
		new vscode.EventEmitter<HistoryTreeItem | undefined | null>();
	readonly onDidChangeTreeData: vscode.Event<HistoryTreeItem | undefined | null> = 
		this._onDidChangeTreeData.event;

	constructor(
		private storage: StorageService,
		private testRunner: TestRunner
	) {}

	refresh(): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	getTreeItem(element: HistoryTreeItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: HistoryTreeItem): Promise<HistoryTreeItem[]> {
		if (element) {
			return [];
		}

		const history = await this.storage.getHistory();
		
		if (history.length === 0) {
			return [];
		}

		return history.map(entry => new HistoryTreeItem(entry, this.testRunner, this.storage));
	}

	/**
	 * Register commands
	 */
	public registerCommands(context: vscode.ExtensionContext): void {
		registerCommandOnce(
			context,
			'globalping.clearHistory',
			async () => {
				await this.storage.clearHistory();
				this.refresh();
				vscode.window.showInformationMessage('History cleared');
			}
		);
	}
}

class HistoryTreeItem extends vscode.TreeItem {
	constructor(
		public readonly entry: TestHistoryEntry,
		private testRunner: TestRunner,
		private storage: StorageService
	) {
		super(
			'label', // This will be replaced by the type guard
			vscode.TreeItemCollapsibleState.None
		);

		if ('type' in entry.config) {
			this.label = `${entry.config.type} - ${entry.config.target}`;
		}

		// Icon based on status
		const iconName = entry.status === 'success' ? 'pass' : 
						entry.status === 'partial' ? 'warning' : 'error';
		// ThemeIcon constructor is available but TypeScript types may be strict
		this.iconPath = new (vscode.ThemeIcon as any)(iconName);

		// Description: time ago
		const timeAgo = this.getTimeAgo(new Date(entry.timestamp));
		this.description = timeAgo;

		// Tooltip
		const tooltip = new vscode.MarkdownString();
		if ('type' in entry.config) {
			tooltip.appendMarkdown(`**${entry.config.type.toUpperCase()} Test**\n\n`);
			tooltip.appendMarkdown(`Target: \`${entry.config.target}\`\n\n`);
			if (Array.isArray(entry.config.locations)) {
				// Extract magic field from location objects
				const locationStrings = entry.config.locations.map((loc: any) => loc.magic || 'Unknown');
				tooltip.appendMarkdown(`Location: ${locationStrings.join(', ')}\n\n`);
			} else if (entry.config.locations) {
				tooltip.appendMarkdown(`Location: ${entry.config.locations}\n\n`);
			}
			tooltip.appendMarkdown(`Probes: ${entry.config.limit}\n\n`);
		}
		tooltip.appendMarkdown(`Status: ${entry.status}\n\n`);
		tooltip.appendMarkdown(`Time: ${new Date(entry.timestamp).toLocaleString()}`);
		this.tooltip = tooltip as any; // MarkdownString is valid but type may be strict

		// Context value for context menu
		this.contextValue = 'historyItem';

		// Command to open results
		this.command = {
			command: 'globalping.openHistoryResult',
			title: 'Open Results',
			arguments: [this.entry]
		};
	}

	private getTimeAgo(date: Date): string {
		const now = new Date();
		const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (seconds < 60) {
			return `${seconds}s ago`;
		}

		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) {
			return `${minutes}m ago`;
		}

		const hours = Math.floor(minutes / 60);
		if (hours < 24) {
			return `${hours}h ago`;
		}

		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}
}

