/**
 * Configuration Service
 * 
 * Manages extension settings and authentication tokens.
 * Uses VS Code's configuration API and secrets API for secure token storage.
 */

import * as vscode from 'vscode';
import { GlobalpingConfig } from '../types/configuration';
import { CONFIG } from '../constants';

export class ConfigService {
	private static readonly CONFIG_SECTION = CONFIG.SECTION;
	private static readonly AUTH_TOKEN_KEY = CONFIG.SECRETS.AUTH_TOKEN;
	
	constructor(
		private context: vscode.ExtensionContext
	) {}

	/**
	 * Get the current extension configuration
	 */
	public getConfig(): GlobalpingConfig {
		const config = vscode.workspace.getConfiguration(ConfigService.CONFIG_SECTION);

		return {
			defaultLocation: config.get(CONFIG.KEYS.DEFAULT_LOCATION, 'world'),
			defaultLimit: config.get(CONFIG.KEYS.DEFAULT_LIMIT, 3),
			inProgressUpdates: config.get(CONFIG.KEYS.IN_PROGRESS_UPDATES, true),
			rawResults: config.get(CONFIG.KEYS.RAW_RESULTS, false),
			defaultHttpProtocol: config.get(CONFIG.KEYS.DEFAULT_HTTP_PROTOCOL, 'HTTPS')
		};
	}

	/**
	 * Get the stored authentication token
	 */
	public async getAuthToken(): Promise<string | undefined> {
		return await this.context.secrets.get(ConfigService.AUTH_TOKEN_KEY);
	}

	/**
	 * Store an authentication token securely
	 */
	public async setAuthToken(token: string): Promise<void> {
		await this.context.secrets.store(ConfigService.AUTH_TOKEN_KEY, token);
	}

	/**
	 * Delete the stored authentication token
	 */
	public async deleteAuthToken(): Promise<void> {
		await this.context.secrets.delete(ConfigService.AUTH_TOKEN_KEY);
	}

	/**
	 * Register a callback for configuration changes
	 */
	public onConfigChange(callback: (config: GlobalpingConfig) => void): vscode.Disposable {
		return vscode.workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration(ConfigService.CONFIG_SECTION)) {
				callback(this.getConfig());
			}
		});
	}
}

