/**
 * Config Validator Tests
 * 
 * Tests for validating measurement configurations before sending to API.
 * These tests catch configuration errors that would cause API failures.
 */

import * as assert from 'assert';
import { ConfigValidator } from '../../../src/validators/configValidator';
import { ValidationError } from '../../../src/services/errors';
// MeasurementConfig is not exported from globalping - using extension's TestConfigBuilder instead
type MeasurementConfig = any; // Local type for test purposes

suite('Config Validator', () => {
	let validator: ConfigValidator;

	suiteSetup(() => {
		validator = new ConfigValidator();
	});

	test('Should validate correct ping config', () => {
		const config: MeasurementConfig = {
			type: 'ping',
			target: 'example.com',
			locations: [{ magic: 'global' }],
			limit: 3
		};

		assert.doesNotThrow(() => validator.validate(config));
	});

	test('Should reject invalid measurement type', () => {
		const config = {
			type: 'invalid',
			target: 'example.com',
			locations: [{ magic: 'global' }],
			limit: 3
		} as any;

		assert.throws(() => validator.validate(config), ValidationError);
	});

	test('Should reject empty target', () => {
		const config: MeasurementConfig = {
			type: 'ping',
			target: '',
			locations: [{ magic: 'global' }],
			limit: 3
		};

		assert.throws(() => validator.validate(config), ValidationError);
	});

	test('Should reject target that is too long', () => {
		const config: MeasurementConfig = {
			type: 'ping',
			target: 'a'.repeat(300), // Too long
			locations: [{ magic: 'global' }],
			limit: 3
		};

		assert.throws(() => validator.validate(config), ValidationError);
	});

	test('Should reject empty locations array', () => {
		const config: MeasurementConfig = {
			type: 'ping',
			target: 'example.com',
			locations: [],
			limit: 3
		};

		assert.throws(() => validator.validate(config), ValidationError);
	});

	test('Should reject too many locations', () => {
		const config: MeasurementConfig = {
			type: 'ping',
			target: 'example.com',
			locations: Array(11).fill('US'), // More than 10
			limit: 3
		};

		assert.throws(() => validator.validate(config), ValidationError);
	});

	test('Should reject limit below 1', () => {
		const config: MeasurementConfig = {
			type: 'ping',
			target: 'example.com',
			locations: [{ magic: 'global' }],
			limit: 0
		};

		assert.throws(() => validator.validate(config), ValidationError);
	});

	test('Should reject limit above 100', () => {
		const config: MeasurementConfig = {
			type: 'ping',
			target: 'example.com',
			locations: [{ magic: 'global' }],
			limit: 101
		};

		assert.throws(() => validator.validate(config), ValidationError);
	});

	test('Should validate HTTP config with options', () => {
		const config: MeasurementConfig = {
			type: 'http',
			target: 'https://example.com',
			locations: [{ magic: 'US' }],
			limit: 5,
			measurementOptions: {
				method: 'GET',
				headers: {
					'User-Agent': 'Test'
				}
			}
		};

		assert.doesNotThrow(() => validator.validate(config));
	});
});

