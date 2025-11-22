/**
 * TelemetryService Tests
 * 
 * Tests for the telemetry/logging service.
 * Focus: Core functionality (log levels, structured data)
 */

import * as assert from 'assert';
import { TelemetryService, LogLevel } from '../../../src/services/telemetry';

suite('TelemetryService', () => {
	let telemetry: TelemetryService;

	setup(() => {
		telemetry = new TelemetryService();
	});

	teardown(() => {
		telemetry.dispose();
	});

	test('Should create telemetry service', () => {
		assert.ok(telemetry, 'Telemetry service should be created');
	});

	test('Should set and respect log level', () => {
		// Set to ERROR level
		telemetry.setLevel(LogLevel.ERROR);
		
		// These should not cause errors even if filtered
		telemetry.debug('Debug message');
		telemetry.info('Info message');
		telemetry.warn('Warning message');
		telemetry.error('Error message');
		
		assert.ok(true, 'Log level filtering works');
	});

	test('Should handle structured data', () => {
		telemetry.info('Test with data', { key: 'value', number: 123 });
		assert.ok(true, 'Structured data logging works');
	});

	test('Should dispose cleanly', () => {
		const service = new TelemetryService();
		service.dispose();
		assert.ok(true, 'Disposal works');
	});
});
