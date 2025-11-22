/**
 * RawDnsFormatter Tests
 *
 * Tests for the raw (CLI-style) DNS formatter.
 * Raw formatters use the API's rawOutput field directly.
 */

import * as assert from 'assert';
import { RawDnsFormatter } from '../../../src/formatters/rawDnsFormatter';
import { successfulDnsMeasurement } from '../fixtures/measurements';

suite('RawDnsFormatter', () => {
	let formatter: RawDnsFormatter;

	setup(() => {
		formatter = new RawDnsFormatter();
	});

	test('Should format using rawOutput from API', () => {
		const formatted = formatter.format(successfulDnsMeasurement);

		assert.ok(formatted, 'Should return formatted output');
		// Should include location header with > prefix
		assert.ok(formatted.match(/^> .+$/m), 'Should include location header with > prefix');
	});

	test('Should include ASN in location header', () => {
		const formatted = formatter.format(successfulDnsMeasurement);

		assert.ok(formatted.includes('(AS'), 'Should include ASN in location header');
	});
});
