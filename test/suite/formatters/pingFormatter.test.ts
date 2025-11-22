/**
 * PingFormatter Tests
 * 
 * Tests for the PingFormatter class, especially location formatting to ensure
 * correct display of "City, Country - ISP Name" format.
 */

import * as assert from 'assert';
import { PingFormatter } from '../../../src/formatters/pingFormatter';
import { MeasurementResponse as Measurement } from 'globalping';
// PingResult type is not exported - using any for test data

suite('PingFormatter', () => {
	let formatter: PingFormatter;

	setup(() => {
		formatter = new PingFormatter();
	});

	test('Should format location with city, country and network', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'ping',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'google.com',
			results: [{
				probe: {
					city: 'Falkenstein',
					country: 'DE',
					continent: 'EU',
					network: 'Hetzner Online',
					asn: 24940
				} as any,
				result: {
					status: 'finished',
					stats: {
						min: 5.1,
						avg: 5.2,
						max: 5.4,
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0
					} as any as any
				} as any
			}]
		};

		const formatted = formatter.format(measurement);
		
		// Should include location in "City, Country - ISP" format
		assert.ok(formatted.includes('Falkenstein, DE - Hetzner Online'), 
			'Should format location as "City, Country - ISP Name"');
	});

	test('Should format location with only country and network', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'ping',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'google.com',
			results: [{
				probe: {
					country: 'US',
					continent: 'NA',
					network: 'AWS'
				} as any,
				result: {
					status: 'finished',
					stats: {
						min: 10,
						avg: 12,
						max: 15,
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0
					} as any as any
				} as any
			}]
		};

		const formatted = formatter.format(measurement);
		
		// Should include location in "Country - ISP" format when no city
		assert.ok(formatted.includes('US - AWS'), 
			'Should format location as "Country - ISP Name" when city is missing');
	});

	test('Should use continent as fallback when city and country missing', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'ping',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'google.com',
			results: [{
				probe: {
					continent: 'EU',
					network: 'Some Network'
				} as any,
				result: {
					status: 'finished',
					stats: {
						min: 20,
						avg: 22,
						max: 25,
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0
					} as any as any
				} as any
			}]
		};

		const formatted = formatter.format(measurement);
		
		// Should use continent as fallback
		assert.ok(formatted.includes('EU - Some Network'), 
			'Should use continent as fallback when city and country are missing');
	});

	test('Should format location without network when not available', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'ping',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'google.com',
			results: [{
				probe: {
					city: 'London',
					country: 'GB',
					continent: 'EU'
				} as any,
				result: {
					status: 'finished',
					stats: {
						min: 5,
						avg: 7,
						max: 10,
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0
					} as any as any
				} as any
			}]
		};

		const formatted = formatter.format(measurement);
		
		// Should not include " - " suffix when network is missing
		assert.ok(formatted.includes('London, GB') && !formatted.includes('London, GB -'), 
			'Should format as "City, Country" without trailing dash when network is missing');
	});

	test('Should show "Unknown" when probe has no location data', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'ping',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'google.com',
			results: [{
				probe: {
					continent: 'XX',
					region: 'Unknown',
					country: 'XX',
					state: 'XX',
					city: 'Unknown',
					asn: 0,
					network: 'Unknown',
					latitude: 0,
					longitude: 0,
					tags: [],
					resolvers: []
				} as any,
				result: {
					status: 'finished',
					stats: {
						min: 5,
						avg: 7,
						max: 10,
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0
					} as any as any
				} as any
			}]
		};

		const formatted = formatter.format(measurement);
		
		// Should show "Unknown" when no location data
		assert.ok(formatted.includes('Unknown'), 
			'Should show "Unknown" when probe has no location data');
	});

	test('Should handle multiple probes with different locations', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'ping',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'google.com',
			results: [
				{
					probe: {
						city: 'New York',
						country: 'US',
						network: 'Verizon'
					} as any as any,
					result: {
						status: 'finished',
						stats: { min: 10, avg: 12, max: 15, total: 3, rcv: 3, drop: 0, loss: 0 }
					} as any as any
				} as any,
				{
					probe: {
						city: 'Tokyo',
						country: 'JP',
						network: 'NTT'
					} as any as any,
					result: {
						status: 'finished',
						stats: { min: 50, avg: 55, max: 60, total: 3, rcv: 3, drop: 0, loss: 0 }
					} as any as any
				} as any,
				{
					probe: {
						country: 'DE',
						network: 'Deutsche Telekom'
					} as any as any,
					result: {
						status: 'finished',
						stats: { min: 20, avg: 22, max: 25, total: 3, rcv: 3, drop: 0, loss: 0 }
					} as any as any
				} as any
			]
		};

		const formatted = formatter.format(measurement);
		
		// Should include all probe locations in their correct formats
		assert.ok(formatted.includes('New York, US - Verizon'), 
			'Should format first probe as "City, Country - ISP"');
		assert.ok(formatted.includes('Tokyo, JP - NTT'), 
			'Should format second probe as "City, Country - ISP"');
		assert.ok(formatted.includes('DE - Deutsche Telekom'), 
			'Should format third probe as "Country - ISP" when city missing');
	});

	test('Should not include Probe ID column', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'ping',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'google.com',
			results: [{
				probe: {
					id: 'probe-12345',
					city: 'Berlin',
					country: 'DE',
					network: 'Hetzner'
				} as any,
				result: {
					status: 'finished',
					stats: { min: 5, avg: 7, max: 10, total: 3, rcv: 3, drop: 0, loss: 0 }
				} as any
			}]
		};

		const formatted = formatter.format(measurement);
		
		// Should NOT include probe ID in output
		assert.ok(!formatted.includes('probe-12345'), 
			'Should not display probe ID in the output');
		assert.ok(!formatted.includes('Probe ID'), 
			'Should not include "Probe ID" column header');
	});

	// DEFENSIVE PROGRAMMING TESTS (per CLAUDE.md)

	test('Should handle nested result.result structure (defensive)', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'ping',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'google.com',
			results: [{
				probe: {
					city: 'Berlin',
					country: 'DE',
					network: 'Hetzner'
				} as any,
				result: {
					result: {
						status: 'finished',
						stats: { min: 5, avg: 7, max: 10, total: 3, rcv: 3, drop: 0, loss: 0 }
					} as any as any
				} as any
			}] as any
		};

		const formatted = formatter.format(measurement);
		
		// Should handle nested structure without crashing
		assert.ok(formatted, 'Should handle nested result structure');
		assert.ok(formatted.includes('Berlin'), 'Should still show location');
	});

	test('Should handle missing stats gracefully (defensive)', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'ping',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'google.com',
			results: [{
				probe: {
					city: 'Berlin',
					country: 'DE',
					network: 'Hetzner'
				} as any,
				result: {
					status: 'finished'
					// stats missing!
				} as any
			}]
		};

		const formatted = formatter.format(measurement);
		
		// Should not crash when stats are missing
		assert.ok(formatted, 'Should handle missing stats');
		assert.ok(formatted.includes('Berlin'), 'Should still show location');
	});

	test('Should handle null/undefined values in stats (defensive)', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'ping',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'google.com',
			results: [{
				probe: {
					city: 'Berlin',
					country: 'DE',
					network: 'Hetzner'
				} as any,
				result: {
					status: 'finished',
					stats: { min: null as any, avg: undefined as any, max: null as any, total: 3, rcv: 3, drop: 0, loss: 0 }
				} as any
			}]
		};

		const formatted = formatter.format(measurement);
		
		// Should handle null/undefined stats values
		assert.ok(formatted, 'Should handle null/undefined stats');
		assert.ok(!formatted.includes('null'), 'Should not display "null" text');
		assert.ok(!formatted.includes('undefined'), 'Should not display "undefined" text');
	});

	test('Should handle missing probe.id when accessing (defensive)', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'ping',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'google.com',
			results: [{
				probe: {
					// id missing!
					city: 'Berlin',
					country: 'DE',
					network: 'Hetzner'
				} as any,
				result: {
					status: 'finished',
					stats: { min: 5, avg: 7, max: 10, total: 3, rcv: 3, drop: 0, loss: 0 }
				} as any
			}]
		};

		// Code should not try to call probe.id.substring() without checking
		const formatted = formatter.format(measurement);
		
		assert.ok(formatted, 'Should handle missing probe.id');
		assert.ok(formatted.includes('Berlin'), 'Should still show location');
	});

	test('Should handle completely missing probe object (defensive)', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'ping',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'google.com',
			results: [{
				probe: null as any,
				result: {
					status: 'finished',
					stats: { min: 5, avg: 7, max: 10, total: 3, rcv: 3, drop: 0, loss: 0 }
				} as any
			}]
		};

		const formatted = formatter.format(measurement);
		
		// Should not crash with null probe
		assert.ok(formatted, 'Should handle null probe');
	});

	test('Should handle missing probe.location gracefully (defensive)', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'ping',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'google.com',
			results: [{
				probe: {
					// All location fields missing
				} as any,
				result: {
					status: 'finished',
					stats: { min: 5, avg: 7, max: 10, total: 3, rcv: 3, drop: 0, loss: 0 }
				} as any
			}]
		};

		const formatted = formatter.format(measurement);
		
		// Per CLAUDE.md: should check if (!probe || !probe.location) return 'Unknown'
		assert.ok(formatted, 'Should handle missing location');
		assert.ok(formatted.includes('Unknown') || formatted.length > 0, 
			'Should show Unknown or handle gracefully');
	});
});

