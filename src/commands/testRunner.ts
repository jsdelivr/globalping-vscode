/**
 * Test Runner
 * 
 * Core test execution orchestrator with progress reporting and cancellation support.
 * All commands use this class to execute tests.
 */

import * as vscode from 'vscode';

import { MeasurementResponse as Measurement } from 'globalping';

import { TestConfig } from '../types/measurement';

import { OutputChannelResultsDisplay } from '../views/outputChannelResultsDisplay';

import { FormatterFactory } from '../formatters/formatterFactory';

import { ConfigValidator } from '../validators/configValidator';

import { GlobalpingClient, PollOptions } from '../services/globalpingClient';

import { StorageService } from '../services/storage';

import { TelemetryService } from '../services/telemetry';

import { ConfigService } from '../services/config';

import { ErrorHandler } from '../services/errorHandler';



export class TestRunner {

	private formatterFactory: FormatterFactory;

	private validator: ConfigValidator;



	constructor(

		private client: GlobalpingClient,

		private storage: StorageService,

		private telemetry: TelemetryService,

		private config: ConfigService,

		private outputChannel: OutputChannelResultsDisplay

	) {

		this.formatterFactory = new FormatterFactory();

		this.validator = new ConfigValidator();

	}



	/**

	 * Execute a test and return the measurement

	 */

	public async execute(

		config: TestConfig,

		_cancellationToken?: vscode.CancellationToken

	): Promise<Measurement> {

		// Validate configuration

		this.validator.validate(config);



		this.telemetry.info('Executing test', { type: config.type, target: config.target });



		return await vscode.window.withProgress(

			{

				location: vscode.ProgressLocation.Notification,

				title: `Testing ${config.target}`,

				cancellable: true

			},

			async (progress, _token) => {

				try {

					// Create measurement

					progress.report({ message: 'Creating measurement...' });

					const response = await this.client.createMeasurement(config);



					// Validate response has required fields

					if (!response || !response.id) {

						this.telemetry.error('createMeasurement returned invalid response', { response });

						throw new Error('Failed to create measurement: No measurement ID returned');

					}



				// Poll for results

				// Only use progress callbacks if enabled (otherwise use more efficient awaitMeasurement)

				this.telemetry.info('Preparing to poll measurement', { 

					measurementId: response.id,

					inProgressUpdates: config.inProgressUpdates 

				});

				

				const pollOptions: PollOptions = config.inProgressUpdates ? {

					interval: 2000,

					onProgress: (measurement: Measurement) => {

						const completed = measurement.results.filter((r: any) => {

							return r.result.status === 'finished' || r.result.status === 'failed';

						}).length;

						const total = measurement.results.length;

						

						progress.report({

							message: `Testing... (${completed}/${total} probes complete)`,

							increment: (completed / total) * 100

						});

					}

				} : {

					interval: 2000

					// No onProgress callback - will use awaitMeasurement for efficiency

				};



				const measurement = await this.client.pollMeasurement(

					response.id,

					config.type,

					pollOptions

				);



				// Log the actual measurement data for debugging

				this.telemetry.info('Measurement received', {

					measurementId: measurement.id,

					status: measurement.status,

					resultsCount: measurement.results?.length || 0,

					firstResult: measurement.results?.[0] ? {

						status: measurement.results[0].result.status,

						hasProbe: !!measurement.results[0].probe,

						probeKeys: measurement.results[0].probe ? Object.keys(measurement.results[0].probe) : []

					} : null

				});



				// Determine test status

					const successCount = measurement.results.filter((r: any) => r.result.status === 'finished').length;

					const totalCount = measurement.results.length;

					const status = successCount === totalCount ? 'success' : 

								successCount > 0 ? 'partial' : 'failed';



					// Store in history

					await this.storage.addHistoryEntry({

						config,

						result: measurement,

						status

					});



					this.telemetry.info('Test completed', {

						type: config.type,

						status,

						successCount,

						totalCount

					});



					return measurement;

				} catch (error: any) {

					this.telemetry.error('Test failed', error);

					throw error;

				} finally {

					// Check rate limits after test completion

					this.checkRateLimits().catch(err => {

						this.telemetry.warn('Failed to check rate limits', err);

					});

				}

			}

		);

	}

	

	/**

	 * Check rate limits and warn user if approaching limit

	 */

	private async checkRateLimits(): Promise<void> {

		try {

			const limits = await this.client.getRateLimits();

			if (!limits) {

				return;

			}

			

			const isAuthenticated = await this.client.isAuthenticated();

			

			// Use centralized error handler for rate limit warnings

			await ErrorHandler.handleRateLimitWarning(

				limits.remaining,

				limits.limit,

				isAuthenticated

			);

		} catch (error) {

			// Silently fail - this is just a courtesy warning

			this.telemetry.debug('Rate limit check failed', error);

		}

	}

	

	/**

	 * Format reset time as human-readable string

	 */

	private formatResetTime(resetDate: Date): string {

		const now = new Date();

		const diffMs = resetDate.getTime() - now.getTime();

		

		if (diffMs < 0) {

			return 'soon';

		}

		

		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 60) {

			return `in ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;

		}

		

		const diffHours = Math.floor(diffMins / 60);

		return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;

	}



	/**

	 * Execute a test and open results

	 */

	public async executeAndShowResults(

		config: TestConfig,

		cancellationToken?: vscode.CancellationToken,

		rawResults?: boolean

	): Promise<void> {

		try {

			const measurement = await this.execute(config, cancellationToken);



			// Format and display results

			await this.showResults(measurement, undefined, rawResults);



		// Show notification only on errors (don't await - let it show async)

		const successCount = measurement.results.filter((r: any) => r.result.status === 'finished').length;

		const totalCount = measurement.results.length;



			// Create notification with "View Results" button (non-blocking) for errors only
			// Success case: no notification - output channel already shown and scrolled to bottom

			if (successCount > 0 && successCount < totalCount) {

				vscode.window.showWarningMessage(

					`⚠️ Test completed with ${totalCount - successCount} failed probes`,

					'View Results'

				).then(action => {

					if (action === 'View Results') {

						this.outputChannel.show();

					}

				});

			} else if (successCount === 0) {

				vscode.window.showErrorMessage(

					'❌ Test failed on all probes',

					'View Results'

				).then(action => {

					if (action === 'View Results') {

						this.outputChannel.show();

					}

				});

			}
			// else: Complete success - no notification needed, output already shown

		} catch (error: any) {

			// Use centralized error handler for user-friendly messages

			await ErrorHandler.handleTestError(error);

			throw error;

		}

	}



	/**

	 * Show formatted results in output channel

	 */

		public async showResults(measurement: Measurement, _resultsProvider?: any, raw: boolean = false): Promise<void> {

			// Always display in output channel

			const appConfig = this.config.getConfig();

			const useRaw = raw || appConfig.rawResults;

			this.outputChannel.displayResults(measurement, useRaw);

		}

	}

