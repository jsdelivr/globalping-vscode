/**
 * HttpFormatter Tests
 * 
 * Tests for the HttpFormatter class, especially location formatting.
 */

import * as assert from 'assert';
import { HttpFormatter } from '../../../src/formatters/httpFormatter';
import { MeasurementResponse as Measurement } from 'globalping';

suite('HttpFormatter', () => {
	let formatter: HttpFormatter;

	setup(() => {
		formatter = new HttpFormatter();
	});

	test('Should format location with city, country and network', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'http',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'https://example.com',
			results: [{
				probe: {
					continent: 'NA',
					region: 'Northern America',
					country: 'US',
					state: 'CA',
					city: 'San Francisco',
					asn: 13335,
					network: 'Cloudflare',
					latitude: 37.7749,
					longitude: -122.4194,
					tags: [],
					resolvers: []
				},
				result: {
					status: 'finished',
					rawOutput: '',
					statusCode: 200,
					timings: {
						total: 100,
						dns: 10,
						tcp: 15,
						tls: 20,
						firstByte: 30,
						download: 25
					}
				} as any
			}]
		};

		const formatted = formatter.format(measurement);
		
		assert.ok(formatted.includes('San Francisco, US - Cloudflare'), 
			'Should format location as "City, Country - ISP Name"');
	});

	test('Should use continent as fallback', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'http',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'https://example.com',
			results: [{
				probe: {
					continent: 'AS',
					region: 'Western Asia',
					country: '',
					state: '',
					city: '',
					asn: 0,
					network: 'Asia Network',
					latitude: 0,
					longitude: 0,
					tags: [],
					resolvers: []
				},
				result: {
					status: 'finished',
					rawOutput: '',
					statusCode: 200,
					timings: {
						total: 200,
						dns: 20,
						tcp: 30,
						tls: 40,
						firstByte: 60,
						download: 50
					},
					headers: {}
				} as any
			}]
		};

		const formatted = formatter.format(measurement);

		assert.ok(formatted.includes('AS - Asia Network'),
			'Should use continent when city and country are missing');
	});

	test('Should handle missing network', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'http',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'https://example.com',
			results: [{
				probe: {
					continent: 'EU',
					region: 'Western Europe',
					country: 'FR',
					state: '',
					city: 'Paris',
					asn: 0,
					network: '',
					latitude: 48.8566,
					longitude: 2.3522,
					tags: [],
					resolvers: []
				},
				result: {
					status: 'finished',
					rawOutput: '',
					statusCode: 200,
					timings: {
						total: 150,
						dns: 15,
						tcp: 20,
						tls: 25,
						firstByte: 45,
						download: 45
					}
				} as any
			}]
		};

		const formatted = formatter.format(measurement);
		
		assert.ok(formatted.includes('Paris, FR') && !formatted.includes('Paris, FR -'), 
			'Should format as "City, Country" without trailing dash when network is missing');
	});

	test('Should show "Unknown" for empty probe', () => {
		const measurement: Measurement = {
			id: 'test-id',
			type: 'http',
			status: 'finished',
			createdAt: '2024-01-01T00:00:00Z',
			updatedAt: '2024-01-01T00:00:00Z',
			probesCount: 1,
			target: 'https://example.com',
			results: [{
				probe: {} as any,
				result: {
					status: 'finished',
					rawOutput: '',
					statusCode: 200,
					timings: {
						total: 100,
						dns: 10,
						tcp: 15,
						tls: 20,
						firstByte: 30,
						download: 25
					},
					headers: {}
				} as any
			}]
		};

		const formatted = formatter.format(measurement);

		assert.ok(formatted.includes('Unknown'),
			'Should show "Unknown" when probe has no location data');
	});
});

