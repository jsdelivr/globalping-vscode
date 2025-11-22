/**
 * Run New Test Command
 * 
 * Handles multi-step Command Palette flow for creating new tests.
 */

import * as vscode from 'vscode';
import { TestRunner } from './testRunner';
import { ConfigService } from '../services/config';
import { MeasurementType } from 'globalping';
import { TestConfigBuilder } from '../services/testConfigBuilder';
import { MeasurementBuilder } from '../services/measurementBuilder';

export class RunNewTestCommand {
	private measurementBuilder = new MeasurementBuilder();

	constructor(
		private testRunner: TestRunner,
		private config: ConfigService,
		private register = vscode.commands.registerCommand
	) {}

	/**
	 * Run new test with multi-step input
	 */
	public async execute(): Promise<void> {
		try {
			// Step 1: Select test type
			const testType = await this.selectTestType();
			if (!testType) {
				return;
			}

			// Step 2: Enter target
			const target = await this.enterTarget(testType);
			if (!target) {
				return;
			}

			// Step 3: Select location(s)
			const locations = await this.selectLocations();
			if (!locations || locations.length === 0) {
				return;
			}

			// Step 4: Set probe limit
			const limit = await this.enterLimit();
			if (!limit) {
				return;
			}
			// Get config
			const appConfig = this.config.getConfig();

			// Build measurement configuration using centralized builder
			let testConfig;
			try {
				const { target: finalTarget, measurementOptions } = this.measurementBuilder.buildConfig(
					target,
					testType,
					appConfig.defaultHttpProtocol
				);

				testConfig = new TestConfigBuilder()
					.withType(testType)
					.withTarget(finalTarget)
					.withLocations(locations)
					.withLimit(limit)
					.withInProgressUpdates(appConfig.inProgressUpdates)
					.withMeasurementOptions(measurementOptions)
					.build();
			} catch (error: any) {
				vscode.window.showErrorMessage(`Failed to run test: ${error.message}`);
				return;
			}

			// Execute test
			await this.testRunner.executeAndShowResults(testConfig);
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to run test: ${error.message}`);
		}
	}

	/**
	 * Step 1: Select test type
	 */
	private async selectTestType(): Promise<MeasurementType | undefined> {
		const items: vscode.QuickPickItem[] = [
			{
				label: '$(pulse) Ping',
				description: 'ICMP echo requests to test connectivity and latency',
				detail: 'Best for: Basic connectivity testing'
			},
			{
				label: '$(globe) HTTP',
				description: 'HTTP/HTTPS requests to test web endpoints',
				detail: 'Best for: Testing APIs and websites'
			},
			{
				label: '$(symbol-namespace) DNS',
				description: 'DNS queries to test name resolution',
				detail: 'Best for: DNS propagation and record validation'
			},
			{
				label: '$(git-branch) Traceroute',
				description: 'Network path tracing',
				detail: 'Best for: Diagnosing routing issues'
			},
			{
				label: '$(layers) MTR',
				description: 'Combined ping and traceroute',
				detail: 'Best for: Continuous network monitoring'
			}
		];

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select test type',
			title: 'Globalping: New Test (Step 1 of 4)'
		});

		if (!selected) {
			return undefined;
		}

		// Map label to type
		const typeMap: Record<string, MeasurementType> = {
			'Ping': 'ping',
			'HTTP': 'http',
			'DNS': 'dns',
			'Traceroute': 'traceroute',
			'MTR': 'mtr'
		};

		const typeKey = selected.label.split(' ')[1];
		return typeMap[typeKey];
	}

	/**
	 * Step 2: Enter target
	 */
	private async enterTarget(testType: MeasurementType): Promise<string | undefined> {
		const placeholder = testType === 'http' 
			? 'https://api.example.com'
			: testType === 'dns'
			? 'example.com'
			: 'example.com or 8.8.8.8';

		const prompt = testType === 'http'
			? 'Enter full URL'
			: testType === 'dns'
			? 'Enter domain name'
			: 'Enter domain or IP address';

		return await vscode.window.showInputBox({
			prompt,
			placeHolder: placeholder,
			title: 'Globalping: New Test (Step 2 of 4)',
			validateInput: (value) => {
				if (!value || value.trim().length === 0) {
					return 'Target is required';
				}
				return undefined;
			}
		});
	}

	/**
	 * Step 3: Select location(s) using Globalping's "magic" field
	 */
	private async selectLocations(): Promise<string[] | undefined> {
		const appConfig = this.config.getConfig();

		// Create quick pick with popular locations
		const quickPick = vscode.window.createQuickPick();
		quickPick.title = 'Globalping: New Test (Step 3 of 4)';
		quickPick.placeholder = 'Select popular location or type custom (e.g., US+GB, continent:EU, aws-us-east-1)';
		
		// Popular locations as quick actions
		const popularLocations = [
			'World',
			'USA',
			'Asia',
			'California',
			'AWS',
			'New York',
			'Comcast',
			'Google+Japan',
			'aws-eu-west-1'
		];

		quickPick.items = popularLocations.map(location => ({
			label: location,
			picked: location.toLowerCase() === appConfig.defaultLocation.toLowerCase()
		}));

		return new Promise<string[] | undefined>((resolve) => {
			quickPick.onDidAccept(() => {
				// If user selected from list, use that
				if (quickPick.activeItems.length > 0) {
					const location = quickPick.activeItems[0].label;
					quickPick.hide();
					resolve([location]);
				} else if (quickPick.value.trim()) {
					// User typed custom location
					const location = quickPick.value.trim();
					quickPick.hide();
					resolve([location]);
				}
			});

			quickPick.onDidHide(() => {
				resolve(undefined);
			});

			quickPick.show();
		});
	}

	/**
	 * Step 4: Enter probe limit
	 */
	private async enterLimit(): Promise<number | undefined> {
		const appConfig = this.config.getConfig();

		const value = await vscode.window.showInputBox({
			prompt: 'Enter number of probes (1-100)',
			placeHolder: String(appConfig.defaultLimit),
			value: String(appConfig.defaultLimit),
			title: 'Globalping: New Test (Step 4 of 4)',
			validateInput: (value) => {
				const num = parseInt(value);
				if (isNaN(num) || num < 1 || num > 100) {
					return 'Must be a number between 1 and 100';
				}
				return undefined;
			}
		});

		return value ? parseInt(value) : undefined;
	}

	/**
	 * Register command
	 */
	public registerCommand(context: vscode.ExtensionContext): void {
		context.subscriptions.push(
			this.register(
				'globalping.runNewTest',
				() => this.execute()
			)
		);
	}
}

