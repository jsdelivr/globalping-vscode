/**
 * Test Runner Webview Provider
 * 
 * Provides the webview UI for the test runner sidebar view.
 */

import * as vscode from 'vscode';
import { TestRunner } from '../commands/testRunner';
import { ConfigService } from '../services/config';
import { StorageService } from '../services/storage';
import { SavedTestsTreeProvider } from './sidebar/savedTestsTreeProvider';
import { MeasurementType } from 'globalping';
import { TestConfigBuilder } from '../services/testConfigBuilder';
import { MeasurementBuilder } from '../services/measurementBuilder';

export class TestRunnerViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'globalping.testRunner';

	private _view?: vscode.WebviewView;
	private measurementBuilder = new MeasurementBuilder();
	private savedTestsProvider?: SavedTestsTreeProvider;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly testRunner: TestRunner,
		private readonly config: ConfigService,
		private readonly storage: StorageService,
		private readonly onTestComplete?: () => void
	) {}

	/**
	 * Set the saved tests provider (called after both providers are initialized)
	 */
	public setSavedTestsProvider(provider: SavedTestsTreeProvider): void {
		this.savedTestsProvider = provider;
	}

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
			switch (message.command) {
				case 'runTest':
					await this.handleRunTest(message.config);
					break;
				case 'saveTest':
					await this.handleSaveTest(message.config);
					break;
				case 'viewResults':
					await this.handleViewResults();
					break;
			}
		});

		// Send initial configuration asynchronously to avoid blocking webview display
		// eslint-disable-next-line no-undef
		setImmediate(() => {
			this.updateWebview();
		});
	}

	private async handleRunTest(testConfig: any): Promise<void> {
		let completed = false;

		try {
			const appConfig = this.config.getConfig();

			// Build measurement configuration using centralized builder
			let finalTarget;
			let finalMeasurementOptions;
			try {
				const result = this.measurementBuilder.buildConfig(
					testConfig.target,
					testConfig.type as MeasurementType,
					appConfig.defaultHttpProtocol,
					{ userOverrides: testConfig.measurementOptions }
				);
				finalTarget = result.target;
				finalMeasurementOptions = result.measurementOptions;
			} catch (error: any) {
				if (this._view) {
					this._view.webview.postMessage({
						command: 'testStatus',
						status: 'error',
						message: error.message || 'Invalid target'
					});
				}
				return;
			}

			const config = new TestConfigBuilder()
				.withType(testConfig.type as MeasurementType)
				.withTarget(finalTarget)
				.withLocations(testConfig.location)
				.withLimit(testConfig.limit)
				.withInProgressUpdates(appConfig.inProgressUpdates)
				.withMeasurementOptions(finalMeasurementOptions)
				.build();

			// Send status update
			if (this._view) {
				this._view.webview.postMessage({
					command: 'testStatus',
					status: 'running',
					message: `Testing ${config.target}...`
				});
			}

			await this.testRunner.executeAndShowResults(config, undefined, testConfig.rawResults);

			// Refresh history if callback provided
			if (this.onTestComplete) {
				this.onTestComplete();
			}

			// Get last result to send statistics
			const lastEntry = await this.storage.getLastHistoryEntry();
			
			// Send success update with result stats
			if (this._view && lastEntry) {
				const successCount = lastEntry.result.results.filter((r: any) => {
					const actualResult = r.result || r;
					return actualResult.status === 'finished';
				}).length;
				const totalCount = lastEntry.result.results.length;
				
				this._view.webview.postMessage({
					command: 'testStatus',
					status: 'completed',
					message: 'Test completed successfully',
					result: {
						success: successCount,
						total: totalCount,
						status: lastEntry.status
					}
				});
				completed = true;
			}
		} catch (error: any) {
			// Send error update
			if (this._view) {
				this._view.webview.postMessage({
					command: 'testStatus',
					status: 'error',
					message: error.message || 'Test failed'
				});
			}
			completed = true;
		} finally {
			// Ensure UI always resets even if message sending failed
			if (!completed && this._view) {
				this._view.webview.postMessage({
					command: 'testStatus',
					status: 'completed',
					message: 'Test completed'
				});
			}
		}
	}

	/**
	 * Load a saved test configuration into the form (Postman-style behavior)
	 */
	public loadTestIntoForm(config: any, rawResults?: boolean): void {
		if (this._view) {
			this._view.webview.postMessage({
				command: 'populateForm',
				config: config,
				rawResults: rawResults
			});

			// Reveal the Test Runner view so user sees the populated form
			this._view.show?.(true);
		}
	}

	private async handleSaveTest(testConfig: any): Promise<void> {
		try {
			const appConfig = this.config.getConfig();

			// Build measurement configuration using centralized builder
			let finalTarget;
			let finalMeasurementOptions;
			try {
				const result = this.measurementBuilder.buildConfig(
					testConfig.target,
					testConfig.type as MeasurementType,
					appConfig.defaultHttpProtocol,
					{ userOverrides: testConfig.measurementOptions }
				);
				finalTarget = result.target;
				finalMeasurementOptions = result.measurementOptions;
			} catch (error: any) {
				if (this._view) {
					this._view.webview.postMessage({
						command: 'saveStatus',
						status: 'error',
						message: error.message || 'Invalid target'
					});
				}
				vscode.window.showErrorMessage(error.message || 'Invalid target');
				return;
			}
			
			const config = new TestConfigBuilder()
				.withType(testConfig.type as MeasurementType)
				.withTarget(finalTarget)
				.withLocations(testConfig.location)
				.withLimit(testConfig.limit)
				.withInProgressUpdates(appConfig.inProgressUpdates)
				.withMeasurementOptions(finalMeasurementOptions)
				.build();

			// Prompt for a name
			const name = await vscode.window.showInputBox({
				prompt: 'Enter a name for this saved target',
				placeHolder: `${config.type} - ${config.target}`,
				title: 'Save Target',
				validateInput: (value) => {
					if (!value || value.trim().length === 0) {
						return 'Name is required';
					}
					if (value.trim().length > 50) {
						return 'Name must be 50 characters or less';
					}
					return undefined;
				}
			});

			if (!name) {
				return; // User cancelled
			}

			await this.storage.addSavedTest({
				name: name.trim(),
				config: config,
				rawResults: testConfig.rawResults
			});

			// Refresh the saved tests view
			this.savedTestsProvider?.refresh();

			// Send success message to webview
			if (this._view) {
				this._view.webview.postMessage({
					command: 'saveStatus',
					status: 'success',
					message: `Saved "${name.trim()}" to favorites`
				});
			}

			vscode.window.showInformationMessage(`Saved "${name.trim()}" to favorites`);
		} catch (error: any) {
			// Send error message to webview
			if (this._view) {
				this._view.webview.postMessage({
					command: 'saveStatus',
					status: 'error',
					message: error.message || 'Failed to save target'
				});
			}
			vscode.window.showErrorMessage(`Failed to save target: ${error.message}`);
		}
	}

	private updateWebview(): void {
		if (this._view) {
			const appConfig = this.config.getConfig();
			this._view.webview.postMessage({
				command: 'config',
				config: {
					defaultLocation: appConfig.defaultLocation,
					defaultLimit: appConfig.defaultLimit
				}
			});
		}
	}

	private async handleViewResults(): Promise<void> {
		const lastEntry = await this.storage.getLastHistoryEntry();
		if (lastEntry) {
			// Show results in output channel
			await this.testRunner.showResults(lastEntry.result);
		} else {
			vscode.window.showInformationMessage('No test results available');
		}
	}

	private _getHtmlForWebview(_webview: vscode.Webview): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Globalping Test Runner</title>
	<style>
		body {
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			padding: 16px;
			margin: 0;
		}

		.form-group {
			margin-bottom: 16px;
			position: relative;
		}

		label {
			display: block;
			margin-bottom: 4px;
			font-weight: 500;
		}

		select, input {
			width: 100%;
			padding: 6px 8px;
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border);
			border-radius: 2px;
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			box-sizing: border-box;
		}


		select:focus, input:focus {
			outline: 1px solid var(--vscode-focusBorder);
			outline-offset: -1px;
		}

		.button-group {
			display: flex;
			gap: 8px;
			margin-top: 8px;
		}

		button {
			flex: 1;
			padding: 8px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 2px;
			cursor: pointer;
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			font-weight: 500;
		}

		button.secondary {
			background-color: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
		}

		button:hover {
			background-color: var(--vscode-button-hoverBackground);
		}

		button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		.status {
			margin-top: 12px;
			padding: 8px;
			border-radius: 2px;
			display: none;
		}

		.status.info {
			background-color: var(--vscode-textBlockQuote-background);
			border-left: 3px solid var(--vscode-textLink-foreground);
		}

		.status.error {
			background-color: var(--vscode-inputValidation-errorBackground);
			border-left: 3px solid var(--vscode-inputValidation-errorBorder);
		}

		.status.success {
			background-color: var(--vscode-inputValidation-infoBackground);
			border-left: 3px solid var(--vscode-inputValidation-infoBorder);
		}

		.status.show {
			display: block;
		}
		.test-options {
			display: none;
			margin-top: 12px;
			padding: 12px;
			background-color: var(--vscode-editor-background);
			border: 1px solid var(--vscode-input-border);
			border-radius: 2px;
		}

		.test-options.visible {
			display: block;
		}

		.options-row {
			display: flex;
			gap: 8px;
			margin-bottom: 12px;
		}

		.options-row .form-group {
			flex: 1;
			margin-bottom: 0;
		}

		.options-row .form-group:last-child {
			margin-bottom: 0;
		}

		.advanced-toggle {
			display: inline-block;
			color: var(--vscode-textLink-foreground);
			cursor: pointer;
			font-size: var(--vscode-font-size);
			text-decoration: none;
			margin-bottom: 16px;
			user-select: none;
		}

		.advanced-toggle:hover {
			text-decoration: underline;
		}

		.advanced-settings {
			display: none;
			margin-bottom: 16px;
		}

		.advanced-settings.visible {
			display: block;
		}

		.dns-query-type {
			display: none;
			margin-bottom: 16px;
		}

		.dns-query-type.visible {
			display: block;
		}

		.dns-query-type .form-group {
			margin-bottom: 0;
		}

		.http-option {
			display: none;
		}

		.http-option.visible {
			display: block;
		}

		/* Results status section */
		.results-status {
			display: none;
			margin-top: 16px;
			padding: 12px;
			border-radius: 4px;
			border-left: 4px solid;
		}

		.results-status.visible {
			display: block;
		}

		.results-status.success {
			background-color: var(--vscode-inputValidation-infoBackground);
			border-left-color: var(--vscode-charts-green);
		}

		.results-status.partial {
			background-color: var(--vscode-inputValidation-warningBackground);
			border-left-color: var(--vscode-charts-yellow);
		}

		.results-status.failed {
			background-color: var(--vscode-inputValidation-errorBackground);
			border-left-color: var(--vscode-charts-red);
		}

		.results-summary {
			font-weight: 500;
			margin-bottom: 8px;
		}

		/* Custom location dropdown */
		.location-autocomplete {
			position: relative;
		}

		.location-dropdown {
			position: absolute;
			top: 100%;
			left: 0;
			right: 0;
			max-height: 200px;
			overflow-y: auto;
			background-color: var(--vscode-dropdown-background);
			border: 1px solid var(--vscode-dropdown-border);
			border-top: none;
			z-index: 1000;
			display: none;
		}

		.location-dropdown.visible {
			display: block;
		}

		.location-option {
			padding: 6px 8px;
			cursor: pointer;
			color: var(--vscode-dropdown-foreground);
		}

		.location-option:hover,
		.location-option.selected {
			background-color: var(--vscode-list-hoverBackground);
		}

		.location-option:active {
			background-color: var(--vscode-list-activeSelectionBackground);
		}
	</style>
</head>
<body>
	<div class="form-group">
		<label for="testType">Test Type</label>
		<select id="testType">
			<option value="ping">Ping</option>
			<option value="http">HTTP</option>
			<option value="dns">DNS</option>
			<option value="traceroute">Traceroute</option>
			<option value="mtr">MTR</option>
		</select>
	</div>

	<div class="form-group">
		<label for="target">Target</label>
		<input type="text" id="target" placeholder="example.com or 8.8.8.8" />
	</div>

	<div class="form-group location-autocomplete">
		<label for="location">Location</label>
		<input type="text" id="location" value="World" placeholder="e.g., World, USA, California, AWS, New York..." autocomplete="off" />
		<div id="locationDropdown" class="location-dropdown"></div>
	</div>

	<!-- HTTP Method - shown only for HTTP tests -->
	<div id="httpMethodField" class="form-group http-option">
		<label for="httpMethod">Method</label>
		<select id="httpMethod">
			<option value="GET">GET</option>
			<option value="HEAD">HEAD</option>
			<option value="OPTIONS">OPTIONS</option>
		</select>
	</div>

	<!-- DNS Query Type - shown only for DNS tests -->
	<div id="dnsQueryTypeField" class="dns-query-type">
		<div class="form-group">
			<label for="dnsQueryType">Query Type</label>
			<select id="dnsQueryType">
				<option value="A">A</option>
				<option value="AAAA">AAAA</option>
				<option value="CNAME">CNAME</option>
				<option value="MX">MX</option>
				<option value="NS">NS</option>
				<option value="TXT">TXT</option>
				<option value="PTR">PTR</option>
			</select>
		</div>
	</div>

	<a id="advancedToggle" class="advanced-toggle">Show advanced settings</a>

	<div id="advancedSettings" class="advanced-settings">
		<!-- Advanced fields: id="ipVersion" id="limit" -->
		<div class="form-group">
			<label for="ipVersion">IP Version</label>
			<select id="ipVersion">
				<option value="4">IPv4</option>
				<option value="6">IPv6</option>
			</select>
		</div>

		<div class="form-group">
			<label for="limit">Number of Probes</label>
			<input type="number" id="limit" min="1" max="100" value="3" />
		</div>

		<div class="form-group">
			<label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
				<input type="checkbox" id="rawResults" style="width: auto; margin: 0;" />
				<span>Raw results (CLI-style output)</span>
			</label>
		</div>

		<!-- Ping Options -->
		<div id="pingOptions" class="test-options">
			<div class="form-group">
				<label for="pingProtocol">Protocol</label>
				<select id="pingProtocol">
					<option value="ICMP">ICMP</option>
					<option value="TCP">TCP</option>
				</select>
			</div>
		</div>

		<!-- HTTP Options -->
		<div id="httpOptions" class="test-options">
			<div class="form-group">
				<label for="httpProtocol">Protocol</label>
				<select id="httpProtocol">
					<option value="HTTPS">HTTPS</option>
					<option value="HTTP">HTTP</option>
					<option value="HTTP2">HTTP/2</option>
				</select>
			</div>
			<div class="form-group">
				<label for="httpPort">Port</label>
				<input type="number" id="httpPort" value="443" min="1" max="65535" />
			</div>
		</div>

		<!-- DNS Options -->
		<div id="dnsOptions" class="test-options">
			<div class="form-group">
				<label for="dnsResolver">Resolver</label>
				<input type="text" id="dnsResolver" placeholder="Local probe resolver" />
			</div>
		</div>

		<!-- Traceroute Options -->
		<div id="tracerouteOptions" class="test-options">
			<div class="form-group">
				<label for="tracerouteProtocol">Protocol</label>
				<select id="tracerouteProtocol">
					<option value="ICMP">ICMP</option>
					<option value="TCP">TCP</option>
					<option value="UDP">UDP</option>
				</select>
			</div>
		</div>

		<!-- MTR Options -->
		<div id="mtrOptions" class="test-options">
			<div class="form-group">
				<label for="mtrProtocol">Protocol</label>
				<select id="mtrProtocol">
					<option value="ICMP">ICMP</option>
					<option value="TCP">TCP</option>
					<option value="UDP">UDP</option>
				</select>
			</div>
		</div>
	</div>

	<div class="button-group">
		<button id="runButton">Run Test</button>
		<button id="saveButton" class="secondary">Save</button>
	</div>

	<div id="status" class="status"></div>

	<div id="resultsStatus" class="results-status">
		<div class="results-summary" id="resultsSummary"></div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();

		// State management
		let saveStateTimeout = null;
		let hasRestoredState = false;

		/**
		 * Save current form state to VS Code's persistent storage
		 * Debounced to avoid excessive saves (500ms)
		 */
		function saveState() {
			if (saveStateTimeout) {
				clearTimeout(saveStateTimeout);
			}

			saveStateTimeout = setTimeout(() => {
				const state = {
					testType: document.getElementById('testType').value,
					target: document.getElementById('target').value,
					location: document.getElementById('location').value,
					ipVersion: document.getElementById('ipVersion').value,
					limit: document.getElementById('limit').value,
					rawResults: document.getElementById('rawResults').checked,
					pingProtocol: document.getElementById('pingProtocol').value,
					httpMethod: document.getElementById('httpMethod').value,
					httpProtocol: document.getElementById('httpProtocol').value,
					httpPort: document.getElementById('httpPort').value,
					dnsQueryType: document.getElementById('dnsQueryType').value,
					dnsResolver: document.getElementById('dnsResolver').value,
					tracerouteProtocol: document.getElementById('tracerouteProtocol').value,
					mtrProtocol: document.getElementById('mtrProtocol').value,
					advancedOpen: document.getElementById('advancedSettings').classList.contains('visible')
				};

				vscode.setState(state);
			}, 500);
		}

		/**
		 * Restore form state from VS Code's persistent storage
		 * Returns true if state was restored, false if no saved state exists
		 */
		function restoreState() {
			const state = vscode.getState();

			if (!state) {
				return false;
			}

			// Restore all input values
			if (state.testType) document.getElementById('testType').value = state.testType;
			if (state.target !== undefined) document.getElementById('target').value = state.target;
			if (state.location !== undefined) document.getElementById('location').value = state.location;
			if (state.ipVersion) document.getElementById('ipVersion').value = state.ipVersion;
			if (state.limit !== undefined) document.getElementById('limit').value = state.limit;
			if (state.rawResults !== undefined) document.getElementById('rawResults').checked = state.rawResults;
			if (state.pingProtocol) document.getElementById('pingProtocol').value = state.pingProtocol;
			if (state.httpMethod) document.getElementById('httpMethod').value = state.httpMethod;
			if (state.httpProtocol) document.getElementById('httpProtocol').value = state.httpProtocol;
			if (state.httpPort !== undefined) document.getElementById('httpPort').value = state.httpPort;
			if (state.dnsQueryType) document.getElementById('dnsQueryType').value = state.dnsQueryType;
			if (state.dnsResolver !== undefined) document.getElementById('dnsResolver').value = state.dnsResolver;
			if (state.tracerouteProtocol) document.getElementById('tracerouteProtocol').value = state.tracerouteProtocol;
			if (state.mtrProtocol) document.getElementById('mtrProtocol').value = state.mtrProtocol;

			// Restore advanced settings visibility
			if (state.advancedOpen) {
				document.getElementById('advancedSettings').classList.add('visible');
				document.getElementById('advancedToggle').textContent = 'Hide advanced settings';
			}

			// Update test options visibility based on restored test type
			updateTestOptions(state.testType || 'ping');

			return true;
		}

		/**
		 * Populate form from saved test configuration (Postman-style)
		 */
		function populateFormFromConfig(config, rawResults) {
			// Basic fields
			document.getElementById('testType').value = config.type;
			document.getElementById('target').value = config.target;

			// Location: extract magic fields from locations array and join with commas
			if (Array.isArray(config.locations) && config.locations.length > 0) {
				const locations = config.locations
					.map(loc => loc.magic)
					.filter(magic => magic)
					.join(', ');
				document.getElementById('location').value = locations || 'World';
			}

			document.getElementById('limit').value = config.limit || 3;

			// Raw results setting
			if (rawResults !== undefined) {
				document.getElementById('rawResults').checked = rawResults;
			}

			// Measurement options
			const opts = config.measurementOptions || {};

			// IP Version
			if (opts.ipVersion) {
				document.getElementById('ipVersion').value = opts.ipVersion;
			}

			// Ping options
			if (config.type === 'ping' && opts.protocol) {
				document.getElementById('pingProtocol').value = opts.protocol;
			}

			// HTTP options
			if (config.type === 'http') {
				if (opts.request?.method) {
					document.getElementById('httpMethod').value = opts.request.method;
				}
				if (opts.protocol) {
					document.getElementById('httpProtocol').value = opts.protocol;
				}
				if (opts.port) {
					document.getElementById('httpPort').value = opts.port;
				}
			}

			// DNS options
			if (config.type === 'dns') {
				if (opts.query?.type) {
					document.getElementById('dnsQueryType').value = opts.query.type;
				}
				if (opts.resolver) {
					document.getElementById('dnsResolver').value = opts.resolver;
				}
			}

			// Traceroute options
			if (config.type === 'traceroute' && opts.protocol) {
				document.getElementById('tracerouteProtocol').value = opts.protocol;
			}

			// MTR options
			if (config.type === 'mtr' && opts.protocol) {
				document.getElementById('mtrProtocol').value = opts.protocol;
			}

			// Update UI visibility based on test type
			updateTestOptions(config.type);

			// Save state so it persists across view switches
			saveState();

			// Show success feedback
			updateStatus('info', 'Test loaded - click "Run Test" to execute');
		}

		// Handle messages from extension
		window.addEventListener('message', event => {
			const message = event.data;
			switch (message.command) {
				case 'config':
					// Only apply defaults if no saved state exists
					if (!hasRestoredState) {
						if (message.config.defaultLimit) {
							document.getElementById('limit').value = message.config.defaultLimit;
						}
						if (message.config.defaultLocation) {
							document.getElementById('location').value = message.config.defaultLocation;
						}
					}
					break;
				case 'populateForm':
					populateFormFromConfig(message.config, message.rawResults);
					break;
				case 'testStatus':
					updateStatus(message.status, message.message, message.result);
					break;
				case 'saveStatus':
					updateStatus(message.status, message.message);
					break;
			}
		});

		function updateStatus(status, message, result) {
			const statusEl = document.getElementById('status');
			const resultsStatusEl = document.getElementById('resultsStatus');
			const resultsSummaryEl = document.getElementById('resultsSummary');
			
			statusEl.className = 'status ' + status + ' show';
			statusEl.textContent = message;
			
			const runButton = document.getElementById('runButton');
			if (status === 'running') {
				runButton.disabled = true;
				runButton.textContent = 'Running...';
				// Hide results status when starting new test
				resultsStatusEl.classList.remove('visible', 'success', 'partial', 'failed');
			} else {
				runButton.disabled = false;
				runButton.textContent = 'Run Test';
				
				// Show results status if result data is available
				if (status === 'completed' && result) {
					const { success, total, status: testStatus } = result;
					
					// Update summary text
					if (testStatus === 'success') {
						resultsSummaryEl.textContent = '\\u2713 Test passed (' + success + '/' + total + ' probes)';
					} else if (testStatus === 'partial') {
						resultsSummaryEl.textContent = '\\u26A0 Partial success (' + success + '/' + total + ' probes)';
					} else {
						resultsSummaryEl.textContent = '\\u2717 Test failed (' + success + '/' + total + ' probes)';
					}
					
					// Update status class
					resultsStatusEl.className = 'results-status visible ' + testStatus;
				}
				
				if (status === 'completed' || status === 'error') {
					setTimeout(() => {
						statusEl.classList.remove('show');
					}, 5000);
				}
			}
		}

		// Location autocomplete
		const locationInput = document.getElementById('location');
		const locationDropdown = document.getElementById('locationDropdown');
		const locationSuggestions = [
			'World',
			'USA',
			'Europe',
			'Asia',
			'Africa',
			'South America',
			'Oceania',
			'California',
			'New York',
			'London',
			'Tokyo',
			'AWS',
			'Azure',
			'Google',
			'Comcast',
			'Verizon',
			'aws-eu-west-1',
			'aws-us-east-1',
			'gcp-us-central1'
		];

		let selectedIndex = -1;

		function filterSuggestions(value) {
			const filter = value.toLowerCase().trim();
			if (!filter) {
				return locationSuggestions;
			}
			return locationSuggestions.filter(s => 
				s.toLowerCase().includes(filter)
			);
		}

		function showDropdown(suggestions) {
			if (suggestions.length === 0) {
				locationDropdown.classList.remove('visible');
				return;
			}

			locationDropdown.innerHTML = '';
			suggestions.forEach((suggestion, index) => {
				const option = document.createElement('div');
				option.className = 'location-option';
				option.textContent = suggestion;
				option.addEventListener('click', () => {
					locationInput.value = suggestion;
					locationDropdown.classList.remove('visible');
					selectedIndex = -1;
				});
				locationDropdown.appendChild(option);
			});
			locationDropdown.classList.add('visible');
			selectedIndex = -1;
		}

		function hideDropdown() {
			locationDropdown.classList.remove('visible');
			selectedIndex = -1;
		}

		locationInput.addEventListener('input', (e) => {
			const suggestions = filterSuggestions(e.target.value);
			showDropdown(suggestions);
		});

		locationInput.addEventListener('focus', (e) => {
			// Always show all suggestions on focus to allow easy selection
			showDropdown(locationSuggestions);
		});

		locationInput.addEventListener('blur', () => {
			// Delay to allow click events on options to fire
			setTimeout(() => hideDropdown(), 200);
		});

		locationInput.addEventListener('keydown', (e) => {
			const options = locationDropdown.querySelectorAll('.location-option');
			
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				if (options.length > 0) {
					selectedIndex = Math.min(selectedIndex + 1, options.length - 1);
					updateSelectedOption(options);
				}
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				if (options.length > 0) {
					selectedIndex = Math.max(selectedIndex - 1, 0);
					updateSelectedOption(options);
				}
			} else if (e.key === 'Enter' && selectedIndex >= 0) {
				e.preventDefault();
				if (options[selectedIndex]) {
					locationInput.value = options[selectedIndex].textContent;
					hideDropdown();
				}
			} else if (e.key === 'Escape') {
				hideDropdown();
			}
		});

		function updateSelectedOption(options) {
			options.forEach((option, index) => {
				if (index === selectedIndex) {
					option.classList.add('selected');
					option.scrollIntoView({ block: 'nearest' });
				} else {
					option.classList.remove('selected');
				}
			});
		}

		// Toggle advanced settings
		document.getElementById('advancedToggle').addEventListener('click', () => {
			const advancedSettings = document.getElementById('advancedSettings');
			const toggleLink = document.getElementById('advancedToggle');

			if (advancedSettings.classList.contains('visible')) {
				advancedSettings.classList.remove('visible');
				toggleLink.textContent = 'Show advanced settings';
			} else {
				advancedSettings.classList.add('visible');
				toggleLink.textContent = 'Hide advanced settings';
			}

			// Save state when toggling advanced settings
			saveState();
		});

		// Show/hide test-specific options based on test type
		function updateTestOptions(testType) {
			// Hide all option panels
			document.querySelectorAll('.test-options').forEach(el => el.classList.remove('visible'));
			
			// Show/hide DNS Query Type field
			const dnsQueryTypeField = document.getElementById('dnsQueryTypeField');
			if (testType === 'dns') {
				dnsQueryTypeField.classList.add('visible');
			} else {
				dnsQueryTypeField.classList.remove('visible');
			}
			
			// Show/hide HTTP Method field
			const httpMethodField = document.getElementById('httpMethodField');
			if (testType === 'http') {
				httpMethodField.classList.add('visible');
			} else {
				httpMethodField.classList.remove('visible');
			}
			
			// Show relevant options panel in advanced settings
			const optionsMap = {
				'ping': 'pingOptions',
				'http': 'httpOptions',
				'dns': 'dnsOptions',
				'traceroute': 'tracerouteOptions',
				'mtr': 'mtrOptions'
			};
			
			const optionsId = optionsMap[testType];
			if (optionsId) {
				document.getElementById(optionsId).classList.add('visible');
			}
		}

		// Update target placeholder and options based on test type
		document.getElementById('testType').addEventListener('change', (e) => {
			const targetInput = document.getElementById('target');
			const testType = e.target.value;

			if (testType === 'http') {
				targetInput.placeholder = 'https://api.example.com';
			} else if (testType === 'dns') {
				targetInput.placeholder = 'example.com';
			} else {
				targetInput.placeholder = 'example.com or 8.8.8.8';
			}

			updateTestOptions(testType);

			// Save state when test type changes
			saveState();
		});

		// HTTP protocol and port auto-detection based on URL
		// Note: This listener is for auto-detection only. State saving is handled by the generic input listener added at initialization.
		// IMPORTANT: Only auto-detect if protocol is not explicitly set to HTTP2 by user
		document.getElementById('target').addEventListener('input', (e) => {
			const testType = document.getElementById('testType').value;
			if (testType === 'http') {
				const target = e.target.value.trim().toLowerCase();
				const portInput = document.getElementById('httpPort');
				const protocolSelect = document.getElementById('httpProtocol');

				// Don't override if user explicitly selected HTTP2
				const currentProtocol = protocolSelect.value;
				if (currentProtocol === 'HTTP2') {
					// User explicitly chose HTTP2 in advanced settings, don't override it
					return;
				}

				if (target.startsWith('https://')) {
					portInput.value = '443';
					protocolSelect.value = 'HTTPS';
				} else if (target.startsWith('http://')) {
					portInput.value = '80';
					protocolSelect.value = 'HTTP';
				}
			}
		});

		// Collect test-specific options
		function collectTestOptions(testType) {
			const ipVersion = parseInt(document.getElementById('ipVersion').value);
			const target = document.getElementById('target').value.trim();

			// Helper to check if a string is an IP address (IPv4 or IPv6)
			function isIpAddress(str) {
				// IPv4 pattern
				const ipv4Pattern = /^(\\d{1,3}\\.){3}\\d{1,3}$/;
				// IPv6 pattern (simplified - matches most common forms)
				const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
				return ipv4Pattern.test(str) || ipv6Pattern.test(str);
			}

			// Extract hostname/IP from target (remove protocol, path, etc.)
			function extractHostname(targetStr) {
				// Remove protocol if present
				let hostname = targetStr.replace(/^https?:\\/\\//, '');
				// Remove path/query/fragment
				hostname = hostname.split('/')[0].split('?')[0].split('#')[0];
				// Remove port
				hostname = hostname.split(':')[0];
				return hostname;
			}

			const hostname = extractHostname(target);
			const targetIsIp = isIpAddress(hostname);

			const options = {};

			switch (testType) {
				case 'ping':
					// Only include ipVersion if target is a domain (not an IP)
					if (!targetIsIp) {
						options.ipVersion = ipVersion;
					}
					options.protocol = document.getElementById('pingProtocol').value;
					break;
				case 'http':
					// Only include ipVersion if target is a domain (not an IP)
					if (!targetIsIp) {
						options.ipVersion = ipVersion;
					}
					options.method = document.getElementById('httpMethod').value;
					options.protocol = document.getElementById('httpProtocol').value;
					options.port = parseInt(document.getElementById('httpPort').value);
					break;
				case 'dns': {
					const queryType = document.getElementById('dnsQueryType').value;
					options.query = { type: queryType };
					const resolver = document.getElementById('dnsResolver').value.trim();
					if (resolver) {
						options.resolver = resolver;
						// Only include ipVersion if resolver is a domain (not an IP address)
						// API validation: ipVersion is not allowed when resolver is an IP address
						if (!isIpAddress(resolver)) {
							options.ipVersion = ipVersion;
						}
					} else {
						// No resolver specified - check target
						if (!targetIsIp) {
							options.ipVersion = ipVersion;
						}
					}
					break;
				}
				case 'traceroute':
					// Only include ipVersion if target is a domain (not an IP)
					if (!targetIsIp) {
						options.ipVersion = ipVersion;
					}
					options.protocol = document.getElementById('tracerouteProtocol').value;
					break;
				case 'mtr':
					// Only include ipVersion if target is a domain (not an IP)
					if (!targetIsIp) {
						options.ipVersion = ipVersion;
					}
					options.protocol = document.getElementById('mtrProtocol').value;
					break;
			}

			return options;
		}

		// Get raw results preference
		function getRawResults() {
			return document.getElementById('rawResults').checked;
		}

		// Handle save button
		document.getElementById('saveButton').addEventListener('click', () => {
			const testType = document.getElementById('testType').value;
			const target = document.getElementById('target').value.trim();
			const location = document.getElementById('location').value.trim() || 'World';
			const limit = parseInt(document.getElementById('limit').value);

			if (!target) {
				updateStatus('error', 'Please enter a target');
				return;
			}

			if (isNaN(limit) || limit < 1 || limit > 100) {
				updateStatus('error', 'Probe limit must be between 1 and 100');
				return;
			}

			const measurementOptions = collectTestOptions(testType);

			vscode.postMessage({
				command: 'saveTest',
				config: {
					type: testType,
					target: target,
					location: location,
					limit: limit,
					measurementOptions: measurementOptions,
					rawResults: getRawResults()
				}
			});
		});

		// Handle form submission
		document.getElementById('runButton').addEventListener('click', () => {
			const testType = document.getElementById('testType').value;
			const target = document.getElementById('target').value.trim();
			const location = document.getElementById('location').value.trim() || 'World';
			const limit = parseInt(document.getElementById('limit').value);

			if (!target) {
				updateStatus('error', 'Please enter a target');
				return;
			}

			if (isNaN(limit) || limit < 1 || limit > 100) {
				updateStatus('error', 'Probe limit must be between 1 and 100');
				return;
			}

			const measurementOptions = collectTestOptions(testType);

			vscode.postMessage({
				command: 'runTest',
				config: {
					type: testType,
					target: target,
					location: location,
					limit: limit,
					measurementOptions: measurementOptions,
					rawResults: getRawResults()
				}
			});
		});

		// Hook up state persistence to all input fields
		const inputIds = [
			'target', 'location', 'ipVersion', 'limit',
			'pingProtocol', 'httpMethod', 'httpProtocol', 'httpPort',
			'dnsQueryType', 'dnsResolver', 'tracerouteProtocol', 'mtrProtocol'
		];

		inputIds.forEach(id => {
			const element = document.getElementById(id);
			if (element) {
				element.addEventListener('input', saveState);
				element.addEventListener('change', saveState);
			}
		});

		// Hook checkbox separately (uses 'change' event)
		document.getElementById('rawResults').addEventListener('change', saveState);

		// Auto-select all text on focus for target and location fields (better UX)
		document.getElementById('target').addEventListener('focus', (e) => {
			e.target.select();
		});

		document.getElementById('location').addEventListener('focus', (e) => {
			e.target.select();
		});

		// Initialize: restore state first, then set defaults if needed
		hasRestoredState = restoreState();

		// Initialize test options visibility based on current test type
		updateTestOptions(document.getElementById('testType').value);
	</script>
</body>
</html>`;
	}
}

