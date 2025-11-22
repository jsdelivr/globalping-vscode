/**
 * Formatter Factory Tests
 * 
 * Tests for the formatter factory that creates appropriate formatters for each test type.
 */

import * as assert from 'assert';
import { FormatterFactory } from '../../../src/formatters/formatterFactory';
import { MeasurementResponse as Measurement } from 'globalping';

suite('Formatter Factory', () => {
	let factory: FormatterFactory;

	suiteSetup(() => {
		factory = new FormatterFactory();
	});

	test('Should format ping results with location', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'ping',
			status: 'finished',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			probesCount: 1,
			target: 'example.com',
		results: [{
			probe: {
				continent: 'NA',
				region: 'Northern America',
				country: 'US',
				state: 'NY',
				city: 'New York',
				asn: 12345,
				network: 'Test Network',
				latitude: 40.7128,
				longitude: -74.0060,
				tags: [],
				resolvers: []
			},
			result: {
				status: 'finished',
				rawOutput: '',
				stats: {
					min: 10,
					avg: 15,
					max: 20,
					total: 3,
					rcv: 3,
					drop: 0,
					loss: 0
				},
				timings: []
			} as any
		}]
		};

		const formatted = factory.format(measurement);
		assert.ok(formatted.length > 0);
		assert.ok(formatted.includes('PING'));
		// Should include city and ISP name in "City, Country - ISP" format
		assert.ok(formatted.includes('New York'));
		assert.ok(formatted.includes('Test Network'));
	});

	test('Should format HTTP results', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'http',
			status: 'finished',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			probesCount: 1,
			target: 'https://example.com',
			results: [{
				probe: {
					continent: 'NA',
					region: 'Northern America',
					country: 'US',
					state: 'NY',
					city: 'New York',
					asn: 12345,
					network: 'Test Network',
					latitude: 40.7128,
					longitude: -74.0060,
					tags: [],
					resolvers: []
				},
				result: {
					status: 'finished',
					rawOutput: '',
					statusCode: 200,
					headers: {},
					timings: {
						total: 100,
						download: 50,
						firstByte: 30,
						dns: 10,
						tcp: 15,
						tls: 20
					}
				} as any
			}]
		};

		const formatted = factory.format(measurement);
		assert.ok(formatted.length > 0);
		assert.ok(formatted.includes('HTTP'));
		assert.ok(formatted.includes('200'));
	});

	test('Should format DNS results', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'dns',
			status: 'finished',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			probesCount: 1,
			target: 'example.com',
			results: [{
				probe: {
					continent: 'NA',
					region: 'Northern America',
					country: 'US',
					state: 'NY',
					city: 'New York',
					asn: 12345,
					network: 'Test Network',
					latitude: 40.7128,
					longitude: -74.0060,
					tags: [],
					resolvers: []
				},
				result: {
					status: 'finished',
					rawOutput: '',
					resolver: '8.8.8.8',
					answers: [{
						name: 'example.com',
						type: 'A',
						value: '93.184.216.34',
						ttl: 3600
					}],
					timings: {
						total: 50
					}
				} as any
			}]
		};

		const formatted = factory.format(measurement);
		assert.ok(formatted.length > 0);
		assert.ok(formatted.includes('DNS'));
		assert.ok(formatted.includes('example.com'));
	});

	test('Should handle failed results', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'ping',
			status: 'finished',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			probesCount: 1,
			target: 'example.com',
		results: [{
			probe: {
				continent: 'NA',
				region: 'Northern America',
				country: 'US',
				state: 'NY',
				city: 'New York',
				asn: 12345,
				network: 'Test Network',
				latitude: 40.7128,
				longitude: -74.0060,
				tags: [],
				resolvers: []
			},
			result: {
				status: 'failed',
				rawOutput: ''
			} as any
		}]
		};

		const formatted = factory.format(measurement);
		assert.ok(formatted.length > 0);
		assert.ok(formatted.includes('FAILED') || formatted.includes('failed'));
	});
});

