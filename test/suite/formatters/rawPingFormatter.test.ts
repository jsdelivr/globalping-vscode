/**
 * RawPingFormatter Tests
 * 
 * Tests for the raw (CLI-style) ping formatter.
 */

import * as assert from 'assert';
import { RawPingFormatter } from '../../../src/formatters/rawPingFormatter';
import { successfulPingMeasurement, missingProbeDataMeasurement } from '../fixtures/measurements';

suite('RawPingFormatter', () => {
	let formatter: RawPingFormatter;

	setup(() => {
		formatter = new RawPingFormatter();
	});

	test('Should format successful ping measurement', () => {
		const formatted = formatter.format(successfulPingMeasurement);
		
		assert.ok(formatted, 'Should return formatted output');
		assert.ok(formatted.includes('PING example.com'), 'Should include target');
		assert.ok(formatted.includes('Falkenstein, DE'), 'Should include location');
		assert.ok(formatted.includes('ping statistics'), 'Should include statistics section');
		assert.ok(formatted.includes('rtt min/avg/max'), 'Should include RTT statistics');
	});

	test('Should handle measurement with missing probe data (defensive)', () => {
		const formatted = formatter.format(missingProbeDataMeasurement);
		
		assert.ok(formatted, 'Should return formatted output');
		assert.ok(formatted.includes('Unknown'), 'Should show Unknown for missing location');
		// Should not crash even with missing data
	});

	test('Should format multiple probes', () => {
		const formatted = formatter.format(successfulPingMeasurement);

		// Count location headers (one per probe) - new format uses `>` prefix
		const locationHeaders = formatted.match(/^> .+$/gm);
		assert.strictEqual(locationHeaders?.length, 3, 'Should have 3 location headers for 3 probes');
	});

	test('Should include packet loss statistics', () => {
		const formatted = formatter.format(successfulPingMeasurement);
		
		assert.ok(formatted.includes('packet loss'), 'Should mention packet loss');
		assert.ok(formatted.includes('0% packet loss') || formatted.includes('packet loss'), 
			'Should show packet loss percentage');
	});

	test('Should format location with city and country', () => {
		const formatted = formatter.format(successfulPingMeasurement);

		assert.ok(formatted.includes('Falkenstein, DE, EU, Hetzner Online (AS24940)'), 'Should format as "> City, Country, Continent, Network (ASN)"');
	});

	test('Should include network with ASN', () => {
		const formatted = formatter.format(successfulPingMeasurement);

		assert.ok(formatted.includes('Hetzner Online (AS24940)') || formatted.includes('AWS (AS16509)') || formatted.includes('NTT (AS2914)'),
			'Should show network with ASN in parentheses');
	});

	test('Should handle probe with only country (no city)', () => {
		const measurement = {
			...missingProbeDataMeasurement,
			results: [{
				probe: { country: 'US' },
				result: {
					status: 'finished' as const,
					stats: { min: 10, avg: 15, max: 20, total: 3, rcv: 3, drop: 0, loss: 0 }
				} as any
			}]
		} as any;

		const formatted = formatter.format(measurement);
		
		assert.ok(formatted.includes('US'), 'Should show country');
		assert.ok(!formatted.includes('Unknown'), 'Should not show Unknown when country exists');
	});

	test('Should handle probe with only continent', () => {
		const measurement = {
			...missingProbeDataMeasurement,
			results: [{
				probe: { continent: 'EU' },
				result: {
					status: 'finished' as const,
					stats: { min: 10, avg: 15, max: 20, total: 3, rcv: 3, drop: 0, loss: 0 }
				} as any
			}]
		} as any;

		const formatted = formatter.format(measurement);
		
		assert.ok(formatted.includes('EU'), 'Should show continent when no city/country');
	});

	test('Should handle failed probe', () => {
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
					status: 'failed' as const,
					error: 'Timeout'
				} as any
			}]
		} as any;

		const formatted = formatter.format(measurement);
		
		assert.ok(formatted.includes('timeout') || formatted.includes('Timeout'), 
			'Should mention timeout for failed probe');
	});

	test('Should show resolved address in statistics', () => {
		const measurement = {
			id: 'test',
			type: 'ping' as const,
			target: 'example.com',
			status: 'finished' as const,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			probesCount: 1,
			results: [{
				probe: { city: 'Test', country: 'US', continent: 'NA', asn: 123, network: 'TestNet' },
				result: {
					status: 'finished' as const,
					rawOutput: 'PING example.com (93.184.216.34): 56 data bytes\n64 bytes from 93.184.216.34: time=10 ms',
					resolvedAddress: '93.184.216.34',
					stats: { min: 10, avg: 15, max: 20, total: 3, rcv: 3, drop: 0, loss: 0 }
				} as any
			}]
		} as any;

		const formatted = formatter.format(measurement);

		assert.ok(formatted.includes('93.184.216.34'), 'Should show resolved IP address');
	});

	test('Should handle null/undefined stats gracefully (defensive)', () => {
		const measurement = {
			id: 'test',
			type: 'ping' as const,
			target: 'example.com',
			status: 'finished' as const,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			probesCount: 1,
			results: [{
				probe: { city: 'Test', country: 'US', continent: 'NA', asn: 123, network: 'TestNet' },
				result: {
					status: 'finished' as const,
					rawOutput: 'PING example.com: 56 data bytes\nRequest timeout',
					stats: { min: null, avg: null, max: null, total: 3, rcv: 3, drop: 0, loss: 0 }
				} as any
			}]
		} as any;

		const formatted = formatter.format(measurement);

		// Should not crash, should show what it can
		assert.ok(formatted, 'Should return formatted output');
		assert.ok(!formatted.includes('null'), 'Should not show "null" values');
	});

	test('Should handle empty probe object (defensive)', () => {
		const measurement = {
			id: 'test',
			type: 'ping' as const,
			target: 'example.com',
			status: 'finished' as const,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			probesCount: 1,
			results: [{
				probe: {},
				result: {
					status: 'finished' as const,
					rawOutput: 'PING example.com: 56 data bytes\n64 bytes from example.com: time=10 ms',
					stats: { min: 10, avg: 15, max: 20, total: 3, rcv: 3, drop: 0, loss: 0 }
				} as any
			}]
		} as any;

		const formatted = formatter.format(measurement);

		assert.ok(formatted, 'Should handle empty probe');
		assert.ok(formatted.includes('> Unknown Location'), 'Should show Unknown for empty probe');
	});
});

