/**
 * RateLimitHandler Tests
 * 
 * Tests for the rate limit handler with exponential backoff.
 */

import * as assert from 'assert';
import { RateLimitHandler } from '../../../src/services/rateLimitHandler';
import { TelemetryService } from '../../../src/services/telemetry';
import { RateLimitError } from '../../../src/services/errors';

suite('RateLimitHandler', () => {
	let telemetry: TelemetryService;
	let handler: RateLimitHandler;

	setup(() => {
		telemetry = new TelemetryService();
		handler = new RateLimitHandler(telemetry);
	});

	teardown(() => {
		telemetry.dispose();
	});

	test('Should create rate limit handler', () => {
		assert.ok(handler, 'Handler should be created');
	});

	test('Should not be rate limited initially', () => {
		assert.strictEqual(handler.isCurrentlyRateLimited(), false,
			'Should not be rate limited initially');
	});

	test('Should have no reset time initially', () => {
		assert.strictEqual(handler.getNextResetTime(), null,
			'Should have no reset time initially');
	});

	test('Should detect rate limit (429) and throw RateLimitError', async () => {
		const response = {
			status: 429,
			headers: {
				'retry-after': '60',
				'x-ratelimit-limit': '100',
				'x-ratelimit-remaining': '0',
				'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600)
			}
		};

		try {
			await handler.handleResponse(response);
			assert.fail('Should throw RateLimitError');
		} catch (error: any) {
			assert.ok(error instanceof RateLimitError, 'Should throw RateLimitError');
			assert.strictEqual(error.retryAfter, 60, 'Should include retry-after value');
			assert.strictEqual(error.limit, 100, 'Should include rate limit');
			assert.strictEqual(error.remaining, 0, 'Should include remaining requests');
		}
	});

	test('Should set rate limited status after 429', async () => {
		const response = {
			status: 429,
			headers: {
				'x-ratelimit-remaining': '0'
			}
		};

		try {
			await handler.handleResponse(response);
		} catch (error) {
			// Expected
		}

		assert.strictEqual(handler.isCurrentlyRateLimited(), true,
			'Should be rate limited after 429');
	});

	test('Should calculate exponential backoff delays', () => {
		assert.strictEqual(handler.getBackoffDelay(0), 1000, 'First attempt: 1 second');
		assert.strictEqual(handler.getBackoffDelay(1), 2000, 'Second attempt: 2 seconds');
		assert.strictEqual(handler.getBackoffDelay(2), 4000, 'Third attempt: 4 seconds');
		assert.strictEqual(handler.getBackoffDelay(3), 8000, 'Fourth attempt: 8 seconds');
		assert.strictEqual(handler.getBackoffDelay(4), 16000, 'Fifth attempt: 16 seconds');
	});

	test('Should allow retries up to max attempts', () => {
		assert.strictEqual(handler.shouldRetry(0), true, 'Should retry on first attempt');
		assert.strictEqual(handler.shouldRetry(1), true, 'Should retry on second attempt');
		assert.strictEqual(handler.shouldRetry(2), true, 'Should retry on third attempt');
		assert.strictEqual(handler.shouldRetry(3), true, 'Should retry on fourth attempt');
		assert.strictEqual(handler.shouldRetry(4), true, 'Should retry on fifth attempt');
		assert.strictEqual(handler.shouldRetry(5), false, 'Should not retry after max attempts');
	});

	test('Should update rate limit status from response headers', async () => {
		const response = {
			status: 200,
			headers: {
				'x-ratelimit-remaining': '50'
			}
		};

		await handler.handleResponse(response);
		assert.strictEqual(handler.isCurrentlyRateLimited(), false,
			'Should not be rate limited when remaining > 0');
	});

	test('Should handle response without rate limit headers', async () => {
		const response = {
			status: 200,
			headers: {}
		};

		assert.doesNotThrow(async () => {
			await handler.handleResponse(response);
		}, 'Should handle response without rate limit headers');
	});

	test('Should wait with backoff (short test)', async function () {
		this.timeout(5000);
		const startTime = Date.now();

		// Test with attempt 0 (1 second delay)
		await handler.waitWithBackoff(0);

		const elapsed = Date.now() - startTime;
		console.log(`[DEBUG] Test elapsed: ${elapsed}ms`);
		assert.ok(elapsed >= 500, 'Should wait at least 500ms'); // Allow variance for slow systems
		assert.ok(elapsed < 1500, 'Should not wait more than 1500ms');
	});

	test('Should handle rate limit without retry-after header', async () => {
		const response = {
			status: 429,
			headers: {}
		};

		try {
			await handler.handleResponse(response);
			assert.fail('Should throw RateLimitError');
		} catch (error: any) {
			assert.ok(error instanceof RateLimitError, 'Should throw RateLimitError');
			assert.strictEqual(error.retryAfter, undefined, 'Should have undefined retryAfter');
			assert.ok(error.message.includes('Please wait'),
				'Error message should suggest waiting');
		}
	});

	test('Should parse reset time from headers', async () => {
		const futureTime = Math.floor(Date.now() / 1000) + 3600;
		const response = {
			status: 429,
			headers: {
				'x-ratelimit-reset': String(futureTime)
			}
		};

		try {
			await handler.handleResponse(response);
		} catch (error) {
			// Expected
		}

		const resetTime = handler.getNextResetTime();
		assert.ok(resetTime instanceof Date, 'Reset time should be a Date');
		assert.ok(resetTime!.getTime() > Date.now(), 'Reset time should be in the future');
	});
});

