/**
 * Defensive Programming Integration Tests
 * 
 * Tests that verify the extension handles missing/nested data gracefully
 * as specified in CLAUDE.md section 9.
 */

import * as assert from 'assert';
import { PingFormatter } from '../../../src/formatters/pingFormatter';
import { HttpFormatter } from '../../../src/formatters/httpFormatter';
import { DnsFormatter } from '../../../src/formatters/dnsFormatter';
import { missingProbeDataMeasurement, nestedResultMeasurement } from '../fixtures/measurements';

suite('Defensive Programming Integration Tests', () => {
	test('Formatters should handle nested result.result structure', () => {
		const formatter = new PingFormatter();
		
		// Should not crash with nested result
		const formatted = formatter.format(nestedResultMeasurement);
		assert.ok(formatted, 'Should format nested result structure');
	});

	test('Formatters should handle missing probe location data', () => {
		const formatter = new PingFormatter();
		
		// Should not crash with missing location
		const formatted = formatter.format(missingProbeDataMeasurement);
		assert.ok(formatted, 'Should handle missing probe location');
		assert.ok(formatted.includes('Unknown') || formatted.length > 0, 
			'Should show Unknown or handle gracefully');
	});

	test('Should handle undefined probe.id without calling substring', () => {
		const measurement = {
			id: 'test',
			type: 'ping' as const,
			target: 'example.com',
			status: 'finished' as const,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			probesCount: 1,
			results: [{
				probe: {
					// id is undefined
					city: 'Test',
					country: 'US'
				},
				result: {
					status: 'finished' as const,
					stats: { min: 10, avg: 15, max: 20, total: 3, rcv: 3, drop: 0, loss: 0 }
				}
			}]
		} as any;

		const formatter = new PingFormatter();
		
		// Should NOT throw "Cannot read property 'substring' of undefined"
		assert.doesNotThrow(() => {
			formatter.format(measurement);
		}, 'Should handle undefined probe.id gracefully');
	});

	test('Should handle missing stats without crashing', () => {
		const measurement = {
			id: 'test',
			type: 'ping' as const,
			target: 'example.com',
			status: 'finished' as const,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			probesCount: 1,
			results: [{
				probe: { city: 'Test', country: 'US' },
				result: {
					status: 'finished' as const
					// stats missing!
				}
			}]
		} as any;

		const formatter = new PingFormatter();
		
		assert.doesNotThrow(() => {
			formatter.format(measurement);
		}, 'Should handle missing stats gracefully');
	});

	test('All formatters should handle null probe', () => {
		const measurement = {
			id: 'test',
			type: 'ping' as const,
			target: 'example.com',
			status: 'finished' as const,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			probesCount: 1,
			results: [{
				probe: null as any,
				result: {
					status: 'finished',
					stats: { min: 10, avg: 15, max: 20, total: 3, rcv: 3, drop: 0, loss: 0 }
				}
			}]
		};

		const formatters = [
			new PingFormatter(),
			new HttpFormatter(),
			new DnsFormatter()
		];

		formatters.forEach(formatter => {
			assert.doesNotThrow(() => {
				formatter.format(measurement as any);
			}, `${formatter.constructor.name} should handle null probe`);
		});
	});

	test('Should handle empty results array', () => {
		const measurement = {
			id: 'test',
			type: 'ping' as const,
			target: 'example.com',
			status: 'finished' as const,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			probesCount: 1,
			results: []
		};

		const formatter = new PingFormatter();
		
		assert.doesNotThrow(() => {
			formatter.format(measurement);
		}, 'Should handle empty results array');
	});
});

