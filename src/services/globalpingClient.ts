/**
 * Globalping API Client
 * 
 * Wrapper around the official Globalping npm library.
 * Adds VS Code-specific functionality: retry logic, progress reporting, error handling.
 * 
 * ⚠️ CRITICAL: All API calls go through the official globalping library.
 * DO NOT implement direct HTTP requests to api.globalping.io
 */

import Globalping, {
	TypedMeasurementRequest as MeasurementRequest,
	CreateMeasurementResponse,
	MeasurementResponse as Measurement,
	Probe,
	MeasurementType,
	MeasurementLocationOption,
	ApiError,
} from 'globalping';
import { RateLimitInfo } from '../types/configuration';
import {
	GlobalpingError,
	RateLimitError,
	AuthenticationError,
	ValidationError,
	NetworkError,
	TimeoutError,
	ServerError
} from './errors';
import { RateLimitHandler } from './rateLimitHandler';
import { TelemetryService } from './telemetry';
import { ConfigService } from './config';

export interface PollOptions {
	interval?: number;  // Polling interval in ms (default: 2000)
	timeout?: number;   // Total timeout in ms (default: type-specific)
	onProgress?: (measurement: Measurement) => void;
}

export class GlobalpingClient {
	private client: Globalping<false> = undefined!; // Globalping client instance
	private rateLimitHandler: RateLimitHandler;
	private readonly userAgent: string;

	// Timeout defaults per measurement type (in milliseconds)
	private readonly timeouts: Record<MeasurementType, number> = {
		ping: 30000,
		http: 45000,
		dns: 30000,
		traceroute: 60000,
		mtr: 90000
	};

	private initializationPromise: Promise<void> | null = null;

	constructor(
		private telemetry: TelemetryService,
		private config: ConfigService,
		version: string = '1.0.0'
	) {
		this.userAgent = `globalping-vscode/${version}`;
		this.rateLimitHandler = new RateLimitHandler(telemetry);
		// Start initialization but don't block constructor
		this.initializationPromise = this.initializeClient();
	}

	private async initializeClient(): Promise<void> {
		try {
			const token = await this.config.getAuthToken();
			
			// Initialize Globalping client
			// Using type assertion as the library types may vary
			const options: any = {
				userAgent: this.userAgent,
				throwApiErrors: false  // We'll handle errors ourselves
			};
			if (token) {
				options.auth = token;  // Library uses 'auth' not 'token'
			}
			
			// Create new client instance
			const newClient = new Globalping(options);

			// Verify client was created successfully
			if (!newClient) {
				throw new Error('Globalping constructor returned undefined');
			}

			// Verify API methods exist
			if (typeof newClient.createMeasurement !== 'function') {
				throw new Error('Globalping client missing createMeasurement method');
			}

			// Only assign to this.client after all validation passes
			this.client = newClient;

			this.telemetry.info('Globalping client initialized', { 
				authenticated: !!token,
				userAgent: this.userAgent
			});
		} catch (error: any) {
			this.telemetry.error('Failed to initialize Globalping client', error);
			// Clear the client to ensure we don't use a partial initialization
			this.client = undefined!;
			// Re-throw so ensureInitialized can handle it
			throw error;
		}
	}

	/**
	 * Ensure client is initialized before use
	 */
	private async ensureInitialized(): Promise<void> {
		// If already initialized, return immediately
		if (this.client && typeof this.client.createMeasurement === 'function') {
			return;
		}

		// Wait for existing initialization promise if it exists
		if (this.initializationPromise) {
			try {
				await this.initializationPromise;
				// Clear the promise after completion
				this.initializationPromise = null;
				
				// Check again after waiting
				if (this.client && typeof this.client.createMeasurement === 'function') {
					return;
				}
				// If client is still not valid after successful promise, something went wrong
				throw new Error('Initialization promise completed but client was not properly initialized');
			} catch (error: any) {
				// Initialization failed, will retry below
				this.telemetry.warn('Initial initialization failed, retrying', error);
				this.initializationPromise = null;
			}
		}

		// If still not initialized, try again (with error handling)
		try {
			this.initializationPromise = this.initializeClient();
			await this.initializationPromise;
			this.initializationPromise = null;
			
			// Final check - this is critical to prevent undefined client access
			if (!this.client || typeof this.client.createMeasurement !== 'function') {
				throw new Error('Client initialization completed but client is still invalid');
			}
		} catch (error: any) {
			this.telemetry.error('Failed to ensure client initialization', error);
			this.initializationPromise = null;
			
			// Provide helpful error message based on the error type
			let message = 'Failed to initialize Globalping client';
			if (error.message) {
				message += `: ${error.message}`;
			}
			if (error.code) {
				message += ` (code: ${error.code})`;
			}
			message += '. Please check your network connection and try again.';
			
			throw new GlobalpingError(message);
		}
	}

	/**
	 * Reinitialize client (e.g., after token change)
	 */
	public async reinitialize(): Promise<void> {
		await this.initializeClient();
	}

	/**
	 * Create a new measurement
	 */
	public async createMeasurement(config: MeasurementRequest): Promise<CreateMeasurementResponse> {
		await this.ensureInitialized();
		
		// Double-check client is initialized (defensive programming)
		if (!this.client) {
			throw new GlobalpingError('Globalping client not initialized after waiting. Please restart VS Code.');
		}
		
		this.telemetry.info('Creating measurement', { type: config.type, target: config.target });

		try {
			const response = await this.executeWithRetry(async () => {
				// Additional safety check before each API call
				if (!this.client) {
					throw new Error('Client became undefined during execution');
				}
				return this.client.createMeasurement(config);
			});

			if (!response.ok) {
				// Throw ApiError with full context for proper error handling
				throw new ApiError(response.request, response.response, response.data);
			}

			this.telemetry.info('Measurement created', { id: response.data.id });

			return response.data;
		} catch (error) {
			this.telemetry.error('Failed to create measurement', error);
			throw this.normalizeError(error);
		}
	}

	/**
	 * Get measurement by ID
	 */
	public async getMeasurement(id: string): Promise<Measurement> {
		await this.ensureInitialized();
		
		// Double-check client is initialized
		if (!this.client) {
			throw new GlobalpingError('Globalping client not initialized after waiting. Please restart VS Code.');
		}
		
		this.telemetry.debug('Getting measurement', { id });

		try {
			const response = await this.executeWithRetry(async () => {
				if (!this.client) {
					throw new Error('Client became undefined during execution');
				}
				return this.client.getMeasurement(id);
			});

			if (!response.ok) {
				throw new ApiError(response.request, response.response, response.data);
			}
			return response.data;
		} catch (error) {
			this.telemetry.error('Failed to get measurement', error);
			throw this.normalizeError(error);
		}
	}

	/**
	 * Poll measurement until completion
	 * Uses awaitMeasurement for reliability with optional progress polling
	 */
	public async pollMeasurement(
		id: string,
		type: MeasurementType,
		options?: PollOptions
	): Promise<Measurement> {
		const interval = options?.interval || 2000;
		const timeout = options?.timeout || this.timeouts[type];
		const startTime = Date.now();

		this.telemetry.info('Starting measurement polling', { 
			id, 
			interval, 
			timeout,
			hasOnProgress: !!options?.onProgress,
			optionsKeys: options ? Object.keys(options) : []
		});

		await this.ensureInitialized();
		if (!this.client) {
			throw new GlobalpingError('Globalping client not initialized after waiting. Please restart VS Code.');
		}

		// Always use awaitMeasurement for reliability, but also do progress polling if callback provided
		if (options?.onProgress) {
			this.telemetry.info('Using awaitMeasurement with progress polling', { id });
			
			const progressCallback = options.onProgress;
			// eslint-disable-next-line no-undef
			const abortController = new AbortController();
			
			// Start awaitMeasurement (doesn't block, returns promise)
			const awaitPromise = this.client.awaitMeasurement(id);

			// Also poll for progress updates while waiting
			void (async () => {
				while (!abortController.signal.aborted) {
					try {
						const measurement = await this.getMeasurement(id);
						
						// Check if cancelled before calling callback
						if (abortController.signal.aborted) {
							break;
						}
						
						// Call progress callback
						progressCallback(measurement);
						
						// Check if finished
						if (measurement.status !== 'in-progress') {
							break;
						}
						
						// Wait before next poll with cancellation support
						await new Promise<void>((resolve, reject) => {
							const timeout = setTimeout(resolve, interval);
							abortController.signal.addEventListener('abort', () => {
								clearTimeout(timeout);
								reject(new Error('Cancelled'));
							});
						});
					} catch (error) {
						// If progress polling fails or is cancelled, that's OK - awaitMeasurement will handle it
						if (!abortController.signal.aborted) {
							this.telemetry.warn('Progress polling failed, relying on awaitMeasurement', error);
						}
						break;
					}
				}
			})();

			// Wait for measurement to complete (via awaitMeasurement)
			try {
				const response = await awaitPromise;

				if (!response.ok) {
					throw new ApiError(response.request, response.response, response.data);
				}

				// Cancel progress poller immediately
				abortController.abort();

				this.telemetry.info('Measurement completed (via awaitMeasurement with progress)', {
					id,
					duration: Date.now() - startTime,
					resultsCount: response.data.results?.length || 0
				});

				return response.data;
			} catch (error: any) {
				// Cancel progress poller on error too
				abortController.abort();

				this.telemetry.error('Failed to await measurement', error);
				throw this.normalizeError(error);
			}
		}

		// No progress callback - use simple awaitMeasurement
		this.telemetry.info('Using awaitMeasurement (no progress callback)', { id });
		try {
			// Use library's built-in awaitMeasurement which handles polling automatically
			const response = await this.client.awaitMeasurement(id);

			if (!response.ok) {
				throw new ApiError(response.request, response.response, response.data);
			}

			this.telemetry.info('Measurement completed (via awaitMeasurement)', {
				id,
				duration: Date.now() - startTime,
				resultsCount: response.data.results?.length || 0
			});

			return response.data;
		} catch (error: any) {
			this.telemetry.error('Failed to await measurement', error);
			throw this.normalizeError(error);
		}
	}

	/**
	 * Get available probes (with optional filters)
	 */
	public async getProbes(): Promise<Probe[]> {
		await this.ensureInitialized();
		
		// Double-check client is initialized
		if (!this.client) {
			throw new GlobalpingError('Globalping client not initialized after waiting. Please restart VS Code.');
		}
		
		this.telemetry.debug('Fetching probes');

		try {
			const response = await this.executeWithRetry(async () => {
				if (!this.client) {
					throw new Error('Client became undefined during execution');
				}
				return this.client.listProbes();
			});

			if (!response.ok) {
				throw new ApiError(response.request, response.response, response.data);
			}

			this.telemetry.info('Probes fetched', { count: response.data.length });
			return response.data;
		} catch (error) {
			this.telemetry.error('Failed to fetch probes', error);
			throw this.normalizeError(error);
		}
	}

	/**
	 * Get rate limit info (works for both authenticated and unauthenticated)
	 */
	public async getRateLimits(): Promise<RateLimitInfo | null> {
		await this.ensureInitialized();

		// Defensive check - client must be initialized
		if (!this.client) {
			this.telemetry.warn('getRateLimits called but client not initialized');
			return null;
		}

		try {
			const token = await this.config.getAuthToken();

			// Use the getLimits() method - works for both authenticated and unauthenticated
			const response = await this.client.getLimits();

			if (!response.ok) {
				// Check for authentication errors specifically
				const status = response.response?.status;
				if (status === 401 || status === 403) {
					const errorData = response.data as any;
					const message = errorData?.error?.message || 'Invalid or expired API token';
					this.telemetry.warn('Authentication failed when fetching rate limits', { status, message });
					throw new AuthenticationError(message);
				}
				throw new ApiError(response.request, response.response, response.data);
			}

			const result = response.data;

			// CRITICAL: Handle nested structure (ONLY current API format)
			const createLimits = result.rateLimit?.measurements?.create;

			if (!createLimits || typeof createLimits.limit === 'undefined' || typeof createLimits.remaining === 'undefined') {
				this.telemetry.warn('Incomplete rate limit data', { result });
				return null;  // Incomplete data
			}

			// Extract credits (available for authenticated users only)
			const credits = result.credits?.remaining;

			this.telemetry.debug('Rate limits fetched successfully', {
				limit: createLimits.limit,
				remaining: createLimits.remaining,
				credits: credits,
			});

			return {
				limit: createLimits.limit,
				remaining: createLimits.remaining,
				reset: new Date((createLimits.reset || 0) * 1000),
				isAuthenticated: !!token,
				credits: credits  // undefined for unauthenticated users
			};
		} catch (error) {
			// Re-throw authentication errors so callers can handle them specifically
			if (error instanceof AuthenticationError) {
				throw error;
			}
			// Log the actual error instead of silent failure
			this.telemetry.error('Failed to get rate limits', error);
			return null;
		}
	}
	
	/**
	 * Check if user is authenticated
	 */
	public async isAuthenticated(): Promise<boolean> {
		const token = await this.config.getAuthToken();
		return !!token;
	}

	/**
	 * Check if currently rate limited
	 */
	public isRateLimited(): boolean {
		return this.rateLimitHandler.isCurrentlyRateLimited();
	}

	/**
	 * Get next rate limit reset time
	 */
	public getNextResetTime(): Date | null {
		return this.rateLimitHandler.getNextResetTime();
	}

	/**
	 * Execute operation with retry logic
	 */
	private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt < 6; attempt++) {
			try {
				return await operation();
			} catch (error: any) {
				lastError = error;

				// Check if it's a rate limit error
				if (error.response?.status === 429) {
					await this.rateLimitHandler.handleResponse(error.response);
					
					if (this.rateLimitHandler.shouldRetry(attempt)) {
						await this.rateLimitHandler.waitWithBackoff(attempt);
						continue;
					}
					
					throw error;
				}

				// For 500-series errors, retry once
				if (error.response?.status >= 500 && error.response?.status < 600 && attempt === 0) {
					this.telemetry.warn('Server error, retrying once', { status: error.response.status });
					await new Promise(resolve => setTimeout(resolve, 2000));
					continue;
				}

				// For network errors, retry once
				if (this.isNetworkError(error) && attempt === 0) {
					this.telemetry.warn('Network error, retrying once');
					await new Promise(resolve => setTimeout(resolve, 2000));
					continue;
				}

				// Don't retry other errors
				throw error;
			}
		}

		throw lastError;
	}

	/**
	 * Normalize API errors to custom error types
	 */
	private normalizeError(error: any): GlobalpingError {
		// Handle undefined/null errors
		if (!error) {
			return new GlobalpingError('Unknown error occurred');
		}

		// Rate limit error
		if (error instanceof RateLimitError) {
			return error;
		}

		// Check if client is not initialized
		if (error.message && error.message.includes('Cannot read properties of undefined')) {
			return new GlobalpingError('Globalping client not initialized. Please try again.');
		}

		// Handle ApiError from Globalping library
		if (error instanceof ApiError) {
			const status = error.response.status;
			const message = error.data?.error?.message || error.message;

			switch (status) {
				case 400:
					return new ValidationError(message);
				case 401:
				case 403:
					return new AuthenticationError(message);
				case 429:
					return new RateLimitError(message);
				case 404:
					return new GlobalpingError('Resource not found');
				case 422:
					return new GlobalpingError(message); // No probes found
				case 500:
				case 502:
				case 503:
					return new ServerError(message, status);
				default:
					return new GlobalpingError(message);
			}
		}

		// Legacy: HTTP error responses (fallback for other error types)
		if (error.response) {
			const status = error.response.status;
			const message = error.response.data?.error?.message || error.message;

			switch (status) {
				case 400:
					return new ValidationError(message);
				case 401:
				case 403:
					return new AuthenticationError(message);
				case 429:
					return new RateLimitError(message);
				case 404:
					return new GlobalpingError('Resource not found');
				case 422:
					return new GlobalpingError(message);
				case 500:
				case 502:
				case 503:
					return new ServerError(message, status);
				default:
					return new GlobalpingError(message);
			}
		}

		// Network errors
		if (this.isNetworkError(error)) {
			return new NetworkError();
		}

		// Timeout errors
		if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
			return new TimeoutError();
		}

		// Generic error
		return new GlobalpingError(error.message || 'Unknown error occurred');
	}

	/**
	 * Check if error is a network error
	 */
	private isNetworkError(error: any): boolean {
		return (
			error.code === 'ECONNREFUSED' ||
			error.code === 'ENOTFOUND' ||
			error.code === 'ENETUNREACH' ||
			error.code === 'EAI_AGAIN' ||
			error.message?.includes('network')
		);
	}

	/**
	 * Parse location string(s) into format expected by API
	 * The "magic" field accepts: global, continent:EU, US, London, aws-us-east-1, US+GB+DE
	 */
	public static parseLocations(locations: string[]): MeasurementLocationOption[] {
		// Globalping API accepts a "magic" field that handles all location types
		// Join multiple locations with +
		if (locations.length === 1) {
			return [{ magic: locations[0] }];
		}
		
		// Multiple locations: can be sent as array or joined with +
		return locations.map(loc => ({ magic: loc }));
	}
}

