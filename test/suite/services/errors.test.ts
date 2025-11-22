/**
 * Error Classes Tests
 * 
 * Tests for custom error types used throughout the extension.
 * Focus: Core error types and inheritance chain
 */

import * as assert from 'assert';
import {
	GlobalpingError,
	RateLimitError,
	AuthenticationError,
	ValidationError,
	NetworkError,
	TimeoutError,
	ServerError
} from '../../../src/services/errors';

suite('Error Classes', () => {
	test('GlobalpingError should be created with message', () => {
		const error = new GlobalpingError('Test error');
		
		assert.ok(error instanceof Error, 'Should be instance of Error');
		assert.ok(error instanceof GlobalpingError, 'Should be instance of GlobalpingError');
		assert.strictEqual(error.message, 'Test error', 'Should have correct message');
		assert.strictEqual(error.name, 'GlobalpingError', 'Should have correct name');
	});

	test('GlobalpingError should accept error code', () => {
		const error = new GlobalpingError('Test error', 'TEST_CODE');
		
		assert.strictEqual(error.code, 'TEST_CODE', 'Should have correct error code');
	});

	test('RateLimitError should extend GlobalpingError', () => {
		const error = new RateLimitError('Rate limit exceeded');
		
		assert.ok(error instanceof Error, 'Should be instance of Error');
		assert.ok(error instanceof GlobalpingError, 'Should be instance of GlobalpingError');
		assert.ok(error instanceof RateLimitError, 'Should be instance of RateLimitError');
		assert.strictEqual(error.name, 'RateLimitError', 'Should have correct name');
		assert.strictEqual(error.code, 'RATE_LIMIT', 'Should have RATE_LIMIT code');
	});

	test('RateLimitError should include rate limit details', () => {
		const resetDate = new Date();
		const error = new RateLimitError(
			'Rate limit exceeded',
			60,     // retryAfter
			100,    // limit
			0,      // remaining
			resetDate
		);
		
		assert.strictEqual(error.retryAfter, 60, 'Should have retryAfter');
		assert.strictEqual(error.limit, 100, 'Should have limit');
		assert.strictEqual(error.remaining, 0, 'Should have remaining');
		assert.strictEqual(error.reset, resetDate, 'Should have reset time');
	});

	test('All error types should be catchable and distinguishable', () => {
		const errors = [
			new RateLimitError('Rate limit'),
			new AuthenticationError('Auth failed'),
			new ValidationError('Validation failed'),
			new NetworkError('Network failed'),
			new TimeoutError('Timeout'),
			new ServerError('Server error')
		];

		errors.forEach(error => {
			try {
				throw error;
			} catch (e: any) {
				assert.ok(e instanceof GlobalpingError, 
					`${error.name} should be caught as GlobalpingError`);
				assert.strictEqual(e.name, error.name, 
					`Caught error should have name ${error.name}`);
			}
		});
	});
});
