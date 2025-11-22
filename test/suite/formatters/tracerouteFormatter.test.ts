/**
 * TracerouteFormatter Tests
 * 
 * Tests for the TracerouteFormatter class, especially:
 * - Location formatting
 * - Nested vs flat API response structures
 * - Missing data handling
 * - Both traceroute and MTR test types
 */

import * as assert from 'assert';
import { TracerouteFormatter } from '../../../src/formatters/tracerouteFormatter';
import { MeasurementResponse as Measurement } from 'globalping';

suite('TracerouteFormatter', () => {
	let formatter: TracerouteFormatter;

	setup(() => {
		formatter = new TracerouteFormatter();
	});

	suite('Nested Structure (Actual API Response)', () => {
		test('Should handle nested result structure with hops', () => {
			const measurement: Measurement = {
				id: 'test-id',
				type: 'traceroute',
				status: 'finished',
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
				target: 'google.com',
		probesCount: 1,
				results: [{
					probe: {
						city: 'Helsinki',
						country: 'FI',
						network: 'Hetzner Online'
					} as any as any,
					result: {
						status: 'finished',
						hops: [
							{
								hop: 1,
								timings: [{ rtt: 0.5 }, { rtt: 0.6 }, { rtt: 0.7 }],
								resolvedAddress: '95.216.3.1',
								resolvedHostname: 'gateway.hetzner.net'
							} as any as any,
							{
								hop: 2,
								timings: [{ rtt: 1.2 }, { rtt: 1.3 }, { rtt: 1.4 }],
								resolvedAddress: '142.250.185.46'
							} as any as any
						]
					} as any as any
				} as any as any]
			};

			const formatted = formatter.format(measurement);
			
			assert.ok(formatted.includes('Helsinki, FI - Hetzner Online'), 
				'Should format location correctly');
			assert.ok(formatted.includes('95.216.3.1'), 
				'Should extract hop addresses from nested structure');
			assert.ok(formatted.includes('gateway.hetzner.net'), 
				'Should extract hostnames from nested structure');
			assert.ok(formatted.includes('0.5ms'), 
				'Should display hop timings');
			assert.ok(!formatted.includes('❌ Traceroute failed'),
				'Should NOT show error message when hops exist');
		});

		test('Should handle nested structure with no hops', () => {
			const measurement: Measurement = {
				id: 'test-id',
				type: 'traceroute',
				status: 'finished',
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
				target: 'unreachable.example',
		probesCount: 1,
				results: [{
					probe: {
						city: 'Falkenstein',
						country: 'DE',
						network: 'Hetzner Online'
					} as any as any,
					result: {
						status: 'finished',
						hops: []
					} as any as any
				} as any as any]
			};

			const formatted = formatter.format(measurement);

			assert.ok(formatted.includes('Falkenstein, DE - Hetzner Online'),
				'Should format location correctly');
			assert.ok(formatted.includes('❌ Traceroute failed'),
				'Should show error message when no hops');
		});

		test('Should handle nested structure with missing hops array', () => {
			const measurement: Measurement = {
				id: 'test-id',
				type: 'traceroute',
				status: 'finished',
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
				target: 'example.com',
		probesCount: 1,
				results: [{
					probe: {
						city: 'Buffalo',
						country: 'US',
						network: 'HostPapa'
					} as any as any,
					result: {
						status: 'finished'
					} as any as any
				} as any as any]
			};

			const formatted = formatter.format(measurement);
			
			assert.ok(formatted.includes('Buffalo, US - HostPapa'),
				'Should format location correctly');
			assert.ok(formatted.includes('❌ Traceroute failed'),
				'Should show error message when hops property is missing');
		});

		test('Should handle multiple probes with mixed nested results', () => {
			const measurement: Measurement = {
				id: 'test-id',
				type: 'traceroute',
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
							hops: [
								{
									hop: 1,
									timings: [{ rtt: 2.1 }, { rtt: 2.2 }, { rtt: 2.3 }],
									resolvedAddress: '10.0.0.1'
								} as any as any
							]
						} as any as any
					} as any as any as any,
					{
						probe: {
							city: 'Tokyo',
							country: 'JP',
							network: 'AWS'
						} as any as any,
						result: {
							status: 'finished',
							hops: []
						} as any as any
					} as any as any as any
				]
			};

			const formatted = formatter.format(measurement);
			
			// First probe should have hops
			assert.ok(formatted.includes('London, GB'),
				'Should show first probe location');
			assert.ok(formatted.includes('10.0.0.1'),
				'Should show first probe hop');
			
			// Second probe should show failure
			assert.ok(formatted.includes('Tokyo, JP'),
				'Should show second probe location');
			
			// Check that only one probe failed
			const failureCount = (formatted.match(/❌ Traceroute failed/g) || []).length;
			assert.strictEqual(failureCount, 1,
				'Should show "Traceroute failed" for second probe only');
		});
	});

	suite('MTR Tests', () => {
		test('Should format MTR results with nested structure', () => {
			const measurement: Measurement = {
				id: 'test-id',
				type: 'mtr',
				status: 'finished',
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
				target: 'google.com',
		probesCount: 1,
				results: [{
					probe: {
						city: 'Los Angeles',
						country: 'US',
						network: 'HostPapa'
					} as any as any,
					result: {
						status: 'finished',
						hops: [
							{
								hop: 1,
								timings: [{ rtt: 0.8 }, { rtt: 0.9 }, { rtt: 1.0 }],
								resolvedAddress: '192.168.1.1'
							} as any as any,
							{
								hop: 2,
								timings: [{ rtt: 5.1 }, { rtt: 5.2 }, { rtt: 5.3 }],
								resolvedAddress: '142.250.185.46',
								resolvedHostname: 'google.com'
							} as any as any
						]
					} as any as any
				} as any as any]
			};

			const formatted = formatter.format(measurement);
			
			assert.ok(formatted.includes('MTR'), 
				'Should show MTR in header for MTR test type');
			assert.ok(formatted.includes('Los Angeles, US - HostPapa'),
				'Should format location correctly for MTR');
			assert.ok(formatted.includes('192.168.1.1'),
				'Should display MTR hop addresses');
			assert.ok(formatted.includes('google.com'),
				'Should display MTR hostnames');
		});

		test('Should handle MTR with no hops', () => {
			const measurement: Measurement = {
				id: 'test-id',
				type: 'mtr',
				status: 'finished',
				createdAt: '2024-01-01T00:00:00Z',
				updatedAt: '2024-01-01T00:00:00Z',
				target: 'example.com',
		probesCount: 1,
				results: [{
					probe: {
						city: 'Paris',
						country: 'FR',
						network: 'OVH'
					} as any as any,
					result: {
						status: 'finished',
						hops: []
					} as any as any
				} as any as any]
			};

			const formatted = formatter.format(measurement);
			
			assert.ok(formatted.includes('MTR'), 
				'Should show MTR in header');
			assert.ok(formatted.includes('❌ Traceroute failed'),
				'Should show error message for failed MTR');
		});
	});
});

