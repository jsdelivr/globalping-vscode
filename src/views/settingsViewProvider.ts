/**
 * Settings Webview Provider
 * 
 * Provides the webview UI for the settings panel in the sidebar.
 * Displays API token status, management buttons, and rate limits.
 */

import * as vscode from 'vscode';
import { ConfigService } from '../services/config';
import { GlobalpingClient } from '../services/globalpingClient';
import { AuthenticationError } from '../services/errors';
import { COMMANDS, URLS, VIEWS } from '../constants';

export class SettingsViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = VIEWS.AUTHENTICATION;

	private _view?: vscode.WebviewView;
	private rateLimitCache?: { data: any; timestamp: number };
	private readonly CACHE_DURATION_MS = 30000; // 30 seconds

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly config: ConfigService,
		private readonly client: GlobalpingClient
	) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(async (message) => {
			try {
				switch (message.command) {
					case 'addToken':
					case 'editToken':
						await vscode.commands.executeCommand(COMMANDS.SET_API_TOKEN);
						await this.refresh();
						break;
					case 'removeToken':
						try {
							// Execute remove token command
							await vscode.commands.executeCommand(COMMANDS.REMOVE_API_TOKEN);
							// Always refresh after command completes (success or cancel)
							await this.refresh();
						} catch (error: any) {
							// Show error to user if command fails
							vscode.window.showErrorMessage(`Failed to remove token: ${error.message}`);
							await this.refresh();
						}
						break;
					case 'checkLimits': {
						const hasToken = await this.hasAuthToken();
						await this.updateRateLimits(true, hasToken);
						break;
					}
					case 'getToken':
						vscode.env.openExternal(vscode.Uri.parse(URLS.TOKEN_DASHBOARD));
						break;
					case 'refresh':
						await this.refresh();
						break;
				}
			} catch (error: any) {
				// Ensure UI never stays on "Loading..." even if something fails
				const hasToken = await this.hasAuthToken();
				this._view?.webview.postMessage({
					command: 'updateStatus',
					authenticated: hasToken,
					limits: null,
					error: error.message || 'Failed to load authentication status'
				});
			}
		});

		// Defer refresh to avoid blocking webview display
		// This allows the UI to show "Loading..." immediately
		// eslint-disable-next-line no-undef
		setImmediate(() => {
			void this.refresh();
		});
	}

	/**
	 * Refresh the webview with current token status and rate limits
	 */
	public async refresh(): Promise<void> {
		if (!this._view) {
			return;
		}

		const hasToken = await this.hasAuthToken();
		
		// Force refresh bypasses cache to ensure fresh data
		await this.updateRateLimits(true, hasToken);
	}

	/**
	 * Update rate limits display
	 */
	private async updateRateLimits(forceRefresh: boolean, authenticated: boolean): Promise<void> {
		if (!this._view) {
			return;
		}

		// Check cache first
		if (!forceRefresh && this.rateLimitCache) {
			const age = Date.now() - this.rateLimitCache.timestamp;
			if (age < this.CACHE_DURATION_MS) {
				this._view.webview.postMessage({
					command: 'updateStatus',
					authenticated: authenticated,
					limits: this.rateLimitCache.data
				});
				return;
			}
		}

		try {
			const limits = await this.client.getRateLimits();

			if (limits) {
				// Cache the result
				this.rateLimitCache = {
					data: limits,
					timestamp: Date.now()
				};

				// If we successfully fetched limits AND a token exists, mark as authenticated
				// (unauthenticated users can also get limits, so we need to check both)
				const hasToken = await this.hasAuthToken();
				this._view.webview.postMessage({
					command: 'updateStatus',
					authenticated: hasToken,  // Token exists and is valid
					limits: limits
				});
			} else {
				// API returned null - post anyway so UI updates from "Loading..."
				this._view.webview.postMessage({
					command: 'updateStatus',
					authenticated: authenticated,
					limits: null
				});
			}
		} catch (error: any) {
			// Check if this is an authentication error (invalid token)
			if (error instanceof AuthenticationError) {
				// Token exists but is invalid
				this._view.webview.postMessage({
					command: 'updateStatus',
					authenticated: false,  // Mark as not authenticated
					limits: null,
					invalidToken: true,  // Special flag for invalid token
					error: 'Invalid or expired API token. Please update your token.'
				});
			} else {
				// Network error or other issue
				this._view.webview.postMessage({
					command: 'updateStatus',
					authenticated: authenticated,
					limits: null,
					error: 'Failed to fetch rate limits. Check your network connection.'
				});
			}
		}
	}

	/**
	 * Check if auth token exists
	 */
	private async hasAuthToken(): Promise<boolean> {
		const token = await this.config.getAuthToken();
		return !!token && token.trim().length > 0;
	}

	private _getHtmlForWebview(_webview: vscode.Webview): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Globalping Settings</title>
	<style>
		body {
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			padding: 16px;
			margin: 0;
		}

		.section {
			margin-bottom: 24px;
		}

		.section-title {
			font-size: 13px;
			font-weight: 600;
			margin-bottom: 12px;
			color: var(--vscode-foreground);
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}

		.status-card {
			background-color: var(--vscode-editor-background);
			border: 1px solid var(--vscode-input-border);
			border-radius: 4px;
			padding: 12px;
			margin-bottom: 12px;
		}

		.status-row {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 8px;
		}

		.status-row:last-child {
			margin-bottom: 0;
		}

		.status-label {
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
		}

		.status-value {
			font-weight: 500;
			font-size: 13px;
		}

		.status-value.authenticated {
			color: var(--vscode-testing-iconPassed);
		}

		.status-value.not-authenticated {
			color: var(--vscode-descriptionForeground);
		}

		.info-box {
			background-color: var(--vscode-textBlockQuote-background);
			border-left: 3px solid var(--vscode-textLink-foreground);
			padding: 10px 12px;
			margin-bottom: 12px;
			font-size: 12px;
			line-height: 1.5;
		}

		.warning-box {
			background-color: var(--vscode-inputValidation-warningBackground);
			border-left: 3px solid var(--vscode-inputValidation-warningBorder);
			padding: 10px 12px;
			margin-bottom: 12px;
			font-size: 12px;
			line-height: 1.5;
		}

		button {
			width: 100%;
			padding: 8px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 2px;
			cursor: pointer;
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			font-weight: 500;
			margin-bottom: 8px;
			box-sizing: border-box;
		}

		button:hover {
			background-color: var(--vscode-button-hoverBackground);
		}

		button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		button.secondary {
			background-color: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
		}

		button.secondary:hover {
			background-color: var(--vscode-button-secondaryHoverBackground);
		}

		button.danger {
			background-color: var(--vscode-inputValidation-errorBackground);
			color: var(--vscode-inputValidation-errorForeground);
			border: 1px solid var(--vscode-inputValidation-errorBorder);
		}

		button.danger:hover {
			opacity: 0.8;
		}

		.link-button {
			display: block;
			width: 100%;
			padding: 8px;
			text-align: center;
			color: var(--vscode-textLink-foreground);
			text-decoration: none;
			border: 1px solid var(--vscode-input-border);
			border-radius: 2px;
			font-size: var(--vscode-font-size);
			cursor: pointer;
			background-color: transparent;
			margin-bottom: 8px;
			box-sizing: border-box;
		}

		.link-button:hover {
			text-decoration: underline;
			background-color: var(--vscode-list-hoverBackground);
		}

		.loading {
			text-align: center;
			padding: 20px;
			color: var(--vscode-descriptionForeground);
		}

		.icon {
			margin-right: 6px;
		}

		.divider {
			height: 1px;
			background-color: var(--vscode-input-border);
			margin: 20px 0;
		}
	</style>
</head>
<body>
	<div id="content">
		<div class="loading">Loading...</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		const TOKEN_DASHBOARD_URL = '${URLS.TOKEN_DASHBOARD}';

		// Handle messages from extension
		window.addEventListener('message', event => {
			const message = event.data;
			switch (message.command) {
				case 'updateStatus':
					updateUI(message);
					break;
			}
		});

		function updateUI(data) {
			const content = document.getElementById('content');

			if (data.invalidToken) {
				// Special state: Token exists but is invalid
				content.innerHTML = getInvalidTokenUI();
			} else if (data.authenticated) {
				content.innerHTML = getAuthenticatedUI(data.limits, data.error);
			} else {
				content.innerHTML = getUnauthenticatedUI(data.limits);
			}
		}

		function getInvalidTokenUI() {
			return \`
				<div class="section">
					<div class="status-card">
						<div class="status-row">
							<span class="status-label">Status</span>
							<span class="status-value" style="color: var(--vscode-errorForeground);">❌ Invalid Token</span>
						</div>
					</div>
					<div class="warning-box">
						⚠️ Your API token is invalid or has expired. Please update it to continue using authenticated features.
					</div>
					<button onclick="editToken()">
						<span class="icon">✏️</span>Update Token
					</button>
					<button class="danger" onclick="removeToken()">
						<span class="icon">🗑️</span>Remove Token
					</button>
					<a class="link-button" href="\${TOKEN_DASHBOARD_URL}" target="_blank" rel="noreferrer" onclick="return openTokenLink(event);">
						Get New API Token
					</a>
				</div>

				<div class="divider"></div>

				<div class="section">
					<div class="section-title">What Happened?</div>
					<div style="font-size: 12px; line-height: 1.6; color: var(--vscode-descriptionForeground);">
						<p style="margin-top: 0;">Your stored API token couldn't be verified. This can happen if:</p>
						<ul style="margin: 8px 0; padding-left: 20px;">
							<li>The token was revoked or expired</li>
							<li>The token was entered incorrectly</li>
							<li>There was a temporary API issue</li>
						</ul>
						<p style="margin-bottom: 0;">Click "Update Token" to enter a new token, or "Remove Token" to use the free tier.</p>
					</div>
				</div>
			\`;
		}

		function getUnauthenticatedUI(limits) {
			let limitsText = 'Loading...';
			if (limits && limits.limit !== undefined && limits.remaining !== undefined) {
				const remaining = limits.remaining || 0;
				const total = limits.limit || 0;
				limitsText = \`\${remaining} of \${total}/hour\`;
			} else if (limits === null) {
				limitsText = 'Unable to fetch limits';
			}
			
			return \`
				<div class="section">
					<div class="status-card">
						<div class="status-row">
							<span class="status-label">Status</span>
							<span class="status-value not-authenticated">Not Authenticated</span>
						</div>
						<div class="status-row">
							<span class="status-label">Limits</span>
							<span class="status-value">\${limitsText}</span>
						</div>
					</div>
					<div class="info-box">
						You're using the free tier with limited requests. Add an API token for higher rate limits.
					</div>
				<button onclick="addToken()">
					<span class="icon">🔑</span>Add API Token
				</button>
				<a class="link-button" href="\${TOKEN_DASHBOARD_URL}" target="_blank" rel="noreferrer" onclick="return openTokenLink(event);">
					Get API Token
				</a>
				</div>

				<div class="divider"></div>

				<div class="section">
					<div class="section-title">About API Tokens</div>
					<div style="font-size: 12px; line-height: 1.6; color: var(--vscode-descriptionForeground);">
						<p style="margin-top: 0;">API tokens are free and provide:</p>
						<ul style="margin: 8px 0; padding-left: 20px;">
							<li>Higher rate limits</li>
							<li>Priority access to probes</li>
							<li>Usage tracking</li>
						</ul>
						<p style="margin-bottom: 0;">Your token is stored securely in VS Code's encrypted storage.</p>
					</div>
				</div>
			\`;
		}

		function getAuthenticatedUI(limits, error) {
			let limitsText = 'Loading...';
			let creditsText = 'Loading...';

			if (error) {
				limitsText = 'Error loading limits';
				creditsText = 'Error loading credits';
			} else if (limits && limits.limit !== undefined && limits.remaining !== undefined) {
				const remaining = limits.remaining || 0;
				const total = limits.limit || 0;

				// Format for status card: "100 of 500/hour"
				limitsText = \`\${remaining} of \${total}/hour\`;

				// Credits are available for authenticated users
				if (limits.credits !== undefined && limits.credits !== null) {
					creditsText = \`\${limits.credits.toLocaleString()}\`;
				} else {
					creditsText = 'N/A';
				}
			} else if (limits === null) {
				limitsText = 'Unable to fetch limits';
				creditsText = 'Unable to fetch credits';
			}

			return \`
				<div class="section">
					<div class="status-card">
						<div class="status-row">
							<span class="status-label">Status</span>
							<span class="status-value authenticated">✓ Authenticated</span>
						</div>
						<div class="status-row">
							<span class="status-label">Limits</span>
							<span class="status-value">\${limitsText}</span>
						</div>
						<div class="status-row">
							<span class="status-label">Credits</span>
							<span class="status-value">\${creditsText}</span>
						</div>
					</div>
					\${error ? \`<div class="warning-box">⚠️ \${error}</div>\` : ''}
					<button class="secondary" onclick="checkLimits()">
						<span class="icon">🔄</span>Refresh Limits
					</button>
					<button class="secondary" onclick="editToken()">
						<span class="icon">✏️</span>Edit Token
					</button>
					<button class="danger" onclick="removeToken()">
						<span class="icon">🗑️</span>Remove Token
					</button>
				</div>
			\`;
		}

		function addToken() {
			vscode.postMessage({ command: 'addToken' });
		}

		function editToken() {
			vscode.postMessage({ command: 'editToken' });
		}

		function removeToken() {
			vscode.postMessage({ command: 'removeToken' });
		}

		function checkLimits() {
			vscode.postMessage({ command: 'checkLimits' });
		}

		function getToken() {
			vscode.postMessage({ command: 'getToken' });
		}

		function openTokenLink(event) {
			if (event) {
				event.preventDefault();
			}
			getToken();
			return false;
		}

		// Request initial data once the webview is ready
		vscode.postMessage({ command: 'refresh' });
	</script>
</body>
</html>`;
	}
}


