/**
 * Storage Service
 *
 * Manages persistence of test history and saved tests.
 * Uses VS Code's globalState for history (persists across workspaces)
 * and workspaceState for saved tests (per-workspace).
 */

import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { TestHistoryEntry, SavedTest } from '../types/measurement';

export class StorageService {
	private static readonly HISTORY_KEY = 'testHistory';
	private static readonly SAVED_TESTS_KEY = 'savedTests';
	private static readonly MAX_HISTORY_SIZE = 25;

	constructor(
		private context: vscode.ExtensionContext
	) {}

	// History Management

	/**
	 * Get all test history entries, sorted by timestamp (newest first)
	 */
	public async getHistory(): Promise<TestHistoryEntry[]> {
		const history = this.context.globalState.get<TestHistoryEntry[]>(
			StorageService.HISTORY_KEY,
			[]
		);
		
		// Sort by timestamp descending (newest first)
		return history.sort((a, b) => 
			new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		);
	}

	/**
	 * Add a new entry to test history
	 */
	public async addHistoryEntry(entry: Omit<TestHistoryEntry, 'id' | 'timestamp'>): Promise<TestHistoryEntry> {
		const newEntry: TestHistoryEntry = {
			...entry,
			id: randomUUID(),
			timestamp: new Date().toISOString()
		};

		const history = await this.getHistory();
		history.unshift(newEntry);

		// Keep only the most recent entries
		const trimmedHistory = history.slice(0, StorageService.MAX_HISTORY_SIZE);

		await this.context.globalState.update(StorageService.HISTORY_KEY, trimmedHistory);

		return newEntry;
	}

	/**
	 * Delete a specific history entry by ID
	 */
	public async deleteHistoryEntry(id: string): Promise<void> {
		const history = await this.getHistory();
		const filtered = history.filter(entry => entry.id !== id);
		await this.context.globalState.update(StorageService.HISTORY_KEY, filtered);
	}

	/**
	 * Clear all test history
	 */
	public async clearHistory(): Promise<void> {
		await this.context.globalState.update(StorageService.HISTORY_KEY, []);
	}

	/**
	 * Get the most recent history entry
	 */
	public async getLastHistoryEntry(): Promise<TestHistoryEntry | undefined> {
		const history = await this.getHistory();
		return history[0]; // Already sorted newest first
	}

	// Saved Tests Management

	/**
	 * Get all saved tests
	 */
	public async getSavedTests(): Promise<SavedTest[]> {
		return this.context.workspaceState.get<SavedTest[]>(
			StorageService.SAVED_TESTS_KEY,
			[]
		);
	}

	/**
	 * Add a new saved test
	 */
	public async addSavedTest(test: Omit<SavedTest, 'id' | 'createdAt'>): Promise<SavedTest> {
		const newTest: SavedTest = {
			...test,
			id: randomUUID(),
			createdAt: new Date().toISOString()
		};

		const tests = await this.getSavedTests();
		tests.push(newTest);

		await this.context.workspaceState.update(StorageService.SAVED_TESTS_KEY, tests);

		return newTest;
	}

	/**
	 * Update an existing saved test
	 */
	public async updateSavedTest(id: string, updates: Partial<SavedTest>): Promise<void> {
		const tests = await this.getSavedTests();
		const index = tests.findIndex(t => t.id === id);

		if (index !== -1) {
			tests[index] = { ...tests[index], ...updates };
			await this.context.workspaceState.update(StorageService.SAVED_TESTS_KEY, tests);
		}
	}

	/**
	 * Delete a saved test by ID
	 */
	public async deleteSavedTest(id: string): Promise<void> {
		const tests = await this.getSavedTests();
		const filtered = tests.filter(test => test.id !== id);
		await this.context.workspaceState.update(StorageService.SAVED_TESTS_KEY, filtered);
	}
}

