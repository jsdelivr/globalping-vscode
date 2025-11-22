/**
 * DnsFormatter Tests
 * 
 * Tests for the DnsFormatter class, especially:
 * - Location formatting
 * - Nested vs flat API response structures
 * - Missing data handling
 */

import * as assert from 'assert';
import { DnsFormatter } from '../../../src/formatters/dnsFormatter';
import { MeasurementResponse as Measurement } from 'globalping';

suite('DnsFormatter', () => {
	let formatter: DnsFormatter;

	setup(() => {
		formatter = new DnsFormatter();
	});

	suite('Nested Structure (Actual API Response)', () => {
		test('Should handle nested result structure with answers', () => {
			const measurement: Measurement = {
				id: 'test-id',
				type: 'dns',
				status: 'finished',
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
				target: 'google.com',
		probesCount: 1,
				results: [{
					probe: {
						city: 'Falkenstein',
						country: 'DE',
						network: 'Hetzner Online'
					} as any as any,
					result: {
						status: 'finished',
						resolver: '185.12.64.2',
						answers: [{
							name: 'google.com',
							type: 'A',
							value: '142.250.185.46',
							ttl: 300
						} as any as any],
						timings: {
							total: 12
						} as any as any
					} as any as any
				} as any as any]
			};

			const formatted = formatter.format(measurement);
			
			assert.ok(formatted.includes('Falkenstein, DE - Hetzner Online'), 
				'Should format location correctly');
			assert.ok(formatted.includes('Resolver: 185.12.64.2'),
				'Should extract resolver from nested structure');
			assert.ok(formatted.includes('Time: 12ms'),
				'Should extract timing from nested structure');
			assert.ok(formatted.includes('A: 142.250.185.46'),
				'Should extract answers from nested structure');
			assert.ok(formatted.includes('TTL: 300s'),
				'Should include TTL information');
			assert.ok(!formatted.includes('❌ No answers received'),
				'Should NOT show error message when answers exist');
		});

		test('Should handle nested structure with multiple answers', () => {
			const measurement: Measurement = {
				id: 'test-id',
				type: 'dns',
				status: 'finished',
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
				target: 'example.com',
		probesCount: 1,
				results: [{
					probe: {
						city: 'Helsinki',
						country: 'FI',
						network: 'Hetzner Online'
					} as any as any,
					result: {
						status: 'finished',
						resolver: '95.216.3.131',
						answers: [
							{
								name: 'example.com',
								type: 'A',
								value: '93.184.216.34',
								ttl: 3600
							} as any as any,
							{
								name: 'example.com',
								type: 'AAAA',
								value: '2606:2800:220:1:248:1893:25c8:1946',
								ttl: 3600
							} as any as any
						],
						timings: {
							total: 8
						} as any as any
					} as any as any
				} as any as any]
			};

			const formatted = formatter.format(measurement);
			
			assert.ok(formatted.includes('A: 93.184.216.34'),
				'Should display first answer');
			assert.ok(formatted.includes('AAAA: 2606:2800:220:1:248:1893:25c8:1946'),
				'Should display second answer');
		});

		test('Should handle nested structure with no answers', () => {
			const measurement: Measurement = {
				id: 'test-id',
				type: 'dns',
				status: 'finished',
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
				target: 'nonexistent.example',
		probesCount: 1,
				results: [{
					probe: {
						city: 'Los Angeles',
						country: 'US',
						network: 'HostPapa'
					} as any as any,
					result: {
						status: 'finished',
						resolver: '8.8.8.8',
						answers: [],
						timings: {
							total: 5
						} as any as any
					} as any as any
				} as any as any]
			};

			const formatted = formatter.format(measurement);
			
			assert.ok(formatted.includes('Los Angeles, US - HostPapa'),
				'Should format location correctly');
			assert.ok(formatted.includes('Resolver: 8.8.8.8'),
				'Should extract resolver from nested structure');
			assert.ok(formatted.includes('Time: 5ms'),
				'Should extract timing from nested structure');
			assert.ok(formatted.includes('❌ No answers received'),
				'Should show error message when no answers');
		});

		test('Should handle multiple probes with mixed nested results', () => {
			const measurement: Measurement = {
				id: 'test-id',
				type: 'dns',
				status: 'finished',
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
				target: 'example.com',
		probesCount: 1,
				results: [
					{
						probe: {
							city: 'London',
							country: 'GB',
							network: 'Digital Ocean'
						} as any as any,
						result: {
							status: 'finished',
							resolver: '1.1.1.1',
							answers: [{
								name: 'example.com',
								type: 'A',
								value: '93.184.216.34',
								ttl: 3600
							} as any as any],
							timings: {
								total: 15
							} as any as any
						} as any as any
					} as any as any as any,
					{
						probe: {
							city: 'Singapore',
							country: 'SG',
							network: 'AWS'
						} as any as any,
						result: {
							status: 'finished',
							resolver: '8.8.8.8',
							answers: [],
							timings: {
								total: 25
							} as any as any
						} as any as any
					} as any as any as any
				]
			};

			const formatted = formatter.format(measurement);
			
			// First probe should have answers
			assert.ok(formatted.includes('London, GB'),
				'Should show first probe location');
			assert.ok(formatted.includes('Resolver: 1.1.1.1'),
				'Should show first probe resolver');
			assert.ok(formatted.includes('A: 93.184.216.34'),
				'Should show first probe answer');
			
			// Second probe should show no answers
			assert.ok(formatted.includes('Singapore, SG'),
				'Should show second probe location');
			assert.ok(formatted.includes('Resolver: 8.8.8.8'),
				'Should show second probe resolver');
			
			// Check that both have their results displayed
			const noAnswersCount = (formatted.match(/❌ No answers received/g) || []).length;
			assert.strictEqual(noAnswersCount, 1,
				'Should show "No answers received" for second probe only');
		});
	});
});

