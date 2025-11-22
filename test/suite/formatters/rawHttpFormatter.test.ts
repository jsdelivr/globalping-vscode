/**
 * RawHttpFormatter Tests
 *
 * Tests for the raw (CLI-style) HTTP formatter.
 * Raw formatters use the API's rawOutput field directly.
 */

import * as assert from 'assert';
import { RawHttpFormatter } from '../../../src/formatters/rawHttpFormatter';
import { successfulHttpMeasurement } from '../fixtures/measurements';

suite('RawHttpFormatter', () => {
	let formatter: RawHttpFormatter;

	setup(() => {
		formatter = new RawHttpFormatter();
	});

	test('Should format using rawOutput from API', () => {
		const formatted = formatter.format(successfulHttpMeasurement);

		assert.ok(formatted, 'Should return formatted output');
		// Should include location header with > prefix
		assert.ok(formatted.match(/^> .+$/m), 'Should include location header with > prefix');
		// Should include rawOutput from API
		assert.ok(formatted.includes('HTTP/1.1'), 'Should include HTTP status from rawOutput');
	});

	test('Should include ASN in location header', () => {
		const formatted = formatter.format(successfulHttpMeasurement);

		assert.ok(formatted.includes('(AS'), 'Should include ASN in location header');
	});
});
