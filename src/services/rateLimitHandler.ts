/**
 * Rate Limit Handler
 * 
 * Handles rate limiting with exponential backoff retry logic.
 * Tracks rate limit status and provides retry delays.
 */

import { RateLimitError } from './errors';
import { TelemetryService } from './telemetry';

export class RateLimitHandler {
	private static readonly MAX_RETRIES = 5;
	private static readonly BASE_DELAY = 1000; // 1 second

	private isRateLimited = false;
	private nextResetTime: Date | null = null;

	constructor(private telemetry: TelemetryService) { }

	/**
	 * Handle API response and check for rate limiting
	 */
	public async handleResponse(response: any): Promise<void> {
		// Check if rate limited
		if (response.status === 429) {
			const retryAfter = response.headers?.['retry-after'];
			const limit = response.headers?.['x-ratelimit-limit'];
			const remaining = response.headers?.['x-ratelimit-remaining'];
			const reset = response.headers?.['x-ratelimit-reset'];

			this.isRateLimited = true;

			if (reset) {
				this.nextResetTime = new Date(parseInt(reset) * 1000);
			}

			const retrySeconds = retryAfter ? parseInt(retryAfter) : null;

			throw new RateLimitError(
				`Rate limit exceeded. ${retrySeconds ? `Retry after ${retrySeconds} seconds.` : 'Please wait before retrying.'}`,
				retrySeconds || undefined,
				limit ? parseInt(limit) : undefined,
				remaining ? parseInt(remaining) : undefined,
				this.nextResetTime || undefined
			);
		}

		// Update rate limit status from headers
		const remaining = response.headers?.['x-ratelimit-remaining'];
		if (remaining !== undefined) {
			this.isRateLimited = parseInt(remaining) === 0;
		}
	}

	/**
	 * Check if we should retry based on attempt number
	 */
	public shouldRetry(attempt: number): boolean {
		return attempt < RateLimitHandler.MAX_RETRIES;
	}

	/**
	 * Get backoff delay for a given attempt (exponential backoff)
	 */
	public getBackoffDelay(attempt: number): number {
		// Exponential backoff: 1s, 2s, 4s, 8s, 16s
		return RateLimitHandler.BASE_DELAY * Math.pow(2, attempt);
	}

	/**
	 * Wait with exponential backoff
	 */
	public async waitWithBackoff(attempt: number): Promise<void> {
		const delay = this.getBackoffDelay(attempt);
		this.telemetry.info(`Rate limited. Waiting ${delay}ms before retry (attempt ${attempt + 1}/${RateLimitHandler.MAX_RETRIES})`);
		await this.sleep(delay);
	}

	/**
	 * Check if currently rate limited
	 */
	public isCurrentlyRateLimited(): boolean {
		if (!this.isRateLimited) {
			return false;
		}

		if (this.nextResetTime && new Date() > this.nextResetTime) {
			this.isRateLimited = false;
			this.nextResetTime = null;
			return false;
		}

		return true;
	}

	/**
	 * Get next rate limit reset time
	 */
	public getNextResetTime(): Date | null {
		return this.nextResetTime;
	}

	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

