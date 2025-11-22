/**
 * Tests for ErrorHandler
 * 
 * Tests error handling utilities and user-friendly error messages.
 */

import * as assert from 'assert';
import { ErrorHandler } from '../../../src/services/errorHandler';
import {
	GlobalpingError,
	ValidationError,
	NetworkError,
	TimeoutError,
	AuthenticationError,
	RateLimitError,
	ServerError
} from '../../../src/services/errors';

suite('ErrorHandler Test Suite', () => {
	test('getErrorTitle returns correct title for ValidationError', () => {
		const error = new ValidationError('Invalid target');
		const title = ErrorHandler.getErrorTitle(error);
		assert.strictEqual(title, 'Invalid Input');
	});

	test('getErrorTitle returns correct title for NetworkError', () => {
		const error = new NetworkError();
		const title = ErrorHandler.getErrorTitle(error);
		assert.strictEqual(title, 'Network Error');
	});

	test('getErrorTitle returns correct title for TimeoutError', () => {
		const error = new TimeoutError();
		const title = ErrorHandler.getErrorTitle(error);
		assert.strictEqual(title, 'Request Timeout');
	});

	test('getErrorTitle returns correct title for AuthenticationError', () => {
		const error = new AuthenticationError();
		const title = ErrorHandler.getErrorTitle(error);
		assert.strictEqual(title, 'Authentication Failed');
	});

	test('getErrorTitle returns correct title for RateLimitError', () => {
		const error = new RateLimitError('Rate limited');
		const title = ErrorHandler.getErrorTitle(error);
		assert.strictEqual(title, 'Rate Limit Exceeded');
	});

	test('getErrorTitle returns correct title for ServerError', () => {
		const error = new ServerError('Server error', 500);
		const title = ErrorHandler.getErrorTitle(error);
		assert.strictEqual(title, 'Server Error');
	});

	test('getErrorTitle returns correct title for generic Error', () => {
		const error = new Error('Generic error');
		const title = ErrorHandler.getErrorTitle(error);
		assert.strictEqual(title, 'Error');
	});

	test('getErrorTitle returns correct title for unknown error', () => {
		const title = ErrorHandler.getErrorTitle('unknown');
		assert.strictEqual(title, 'Unknown Error');
	});

	test('isRetryable returns true for NetworkError', () => {
		const error = new NetworkError();
		assert.strictEqual(ErrorHandler.isRetryable(error), true);
	});

	test('isRetryable returns true for TimeoutError', () => {
		const error = new TimeoutError();
		assert.strictEqual(ErrorHandler.isRetryable(error), true);
	});

	test('isRetryable returns true for ServerError', () => {
		const error = new ServerError('Server error', 500);
		assert.strictEqual(ErrorHandler.isRetryable(error), true);
	});

	test('isRetryable returns false for ValidationError', () => {
		const error = new ValidationError('Invalid input');
		assert.strictEqual(ErrorHandler.isRetryable(error), false);
	});

	test('isRetryable returns false for AuthenticationError', () => {
		const error = new AuthenticationError();
		assert.strictEqual(ErrorHandler.isRetryable(error), false);
	});

	test('requiresUserAction returns true for ValidationError', () => {
		const error = new ValidationError('Invalid input');
		assert.strictEqual(ErrorHandler.requiresUserAction(error), true);
	});

	test('requiresUserAction returns true for AuthenticationError', () => {
		const error = new AuthenticationError();
		assert.strictEqual(ErrorHandler.requiresUserAction(error), true);
	});

	test('requiresUserAction returns false for NetworkError', () => {
		const error = new NetworkError();
		assert.strictEqual(ErrorHandler.requiresUserAction(error), false);
	});

	test('formatErrorForTelemetry removes sensitive data from GlobalpingError', () => {
		const error = new ValidationError('Sensitive user data here');
		const formatted = ErrorHandler.formatErrorForTelemetry(error);
		
		assert.strictEqual(formatted.name, 'ValidationError');
		assert.strictEqual(formatted.code, 'VALIDATION_ERROR');
		assert.strictEqual(formatted.hasMessage, true);
		// Should not include actual message
		assert.strictEqual(formatted.message, undefined);
	});

	test('formatErrorForTelemetry handles generic Error', () => {
		const error = new Error('Test error');
		const formatted = ErrorHandler.formatErrorForTelemetry(error);
		
		assert.strictEqual(formatted.name, 'Error');
		assert.strictEqual(formatted.hasMessage, true);
		assert.ok(formatted.stack);
	});

	test('formatErrorForTelemetry handles unknown error types', () => {
		const formatted = ErrorHandler.formatErrorForTelemetry('string error');
		
		assert.strictEqual(formatted.type, 'string');
		assert.ok(formatted.value);
	});

	test('formatErrorForTelemetry truncates long values', () => {
		const longError = 'a'.repeat(200);
		const formatted = ErrorHandler.formatErrorForTelemetry(longError);
		
		assert.ok(formatted.value.length <= 100);
	});
});

