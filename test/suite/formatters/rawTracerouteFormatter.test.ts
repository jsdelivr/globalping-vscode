/**
 * RawTracerouteFormatter Tests
 *
 * Tests for the raw (CLI-style) traceroute formatter.
 * Raw formatters use the API's rawOutput field directly.
 */

import * as assert from 'assert';
import { RawTracerouteFormatter } from '../../../src/formatters/rawTracerouteFormatter';

suite('RawTracerouteFormatter', () => {
	let formatter: RawTracerouteFormatter;

	setup(() => {
		formatter = new RawTracerouteFormatter();
	});

	test('Should format using rawOutput from API', () => {
		const measurement: any = {
			id: 'test-trace',
			type: 'traceroute',
			target: 'example.com',
			status: 'finished',
			createdAt: '2024-01-01T12:00:00Z',
			updatedAt: '2024-01-01T12:00:10Z',
			probesCount: 1,
			results: [{
				probe: {
					continent: 'EU',
					country: 'DE',
					city: 'Berlin',
					asn: 24940,
					network: 'Hetzner'
				},
				result: {
					status: 'finished',
					rawOutput: 'traceroute to example.com\n 1  10.0.0.1  1.2 ms\n 2  20.0.0.1  5.4 ms'
				}
			}]
		};

		const formatted = formatter.format(measurement);

		assert.ok(formatted, 'Should return formatted output');
		// Should include location header with > prefix
		assert.ok(formatted.match(/^> .+$/m), 'Should include location header with > prefix');
		// Should include rawOutput
		assert.ok(formatted.includes('traceroute to example.com'), 'Should include traceroute output');
	});

	test('Should include ASN in location header', () => {
		const measurement: any = {
			id: 'test-trace',
			type: 'traceroute',
			target: 'example.com',
			status: 'finished',
			createdAt: '2024-01-01T12:00:00Z',
			updatedAt: '2024-01-01T12:00:10Z',
			probesCount: 1,
			results: [{
				probe: {
					continent: 'EU',
					country: 'DE',
					city: 'Berlin',
					asn: 24940,
					network: 'Hetzner'
				},
				result: {
					status: 'finished',
					rawOutput: 'traceroute to example.com\n 1  10.0.0.1  1.2 ms'
				}
			}]
		};

		const formatted = formatter.format(measurement);

		assert.ok(formatted.includes('(AS24940)'), 'Should include ASN in location header');
	});
});
