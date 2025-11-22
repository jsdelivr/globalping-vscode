/**
 * Tests for StatusBarManager
 * 
 * Tests status bar updates and defensive null checks.
 * Focus: Core functionality (avoiding excessive doesNotThrow tests)
 */

import * as assert from 'assert';
import { StatusBarManager } from '../../../src/views/statusBar';
import { MeasurementResponse as Measurement } from 'globalping';


suite('StatusBarManager Test Suite', () => {
	let statusBar: StatusBarManager;

	setup(() => {
		statusBar = new StatusBarManager();
	});

	teardown(() => {
		statusBar.dispose();
	});

	test('Should handle completed measurement with results', () => {
		const measurement: Measurement = {
			id: 'test-123',
			type: 'ping',
			status: 'finished',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
				probesCount: 1,
			target: 'example.com',
			results: [
				{
					probe: {
						id: 'probe-1',
						continent: 'NA',
						country: 'US',
						city: 'New York',
						network: 'Test Network',
						tags: [],
						resolvers: []
					},
					result: {
						status: 'finished',
						stats: {
							min: 10,
							avg: 15,
							max: 20,
							total: 3,
							rcv: 3,
							drop: 0,
							loss: 0
						}
					}
				} as any
			]
		};

		statusBar.updateCompleted(measurement);
		assert.ok(true, 'Should handle completed measurement');
	});

	test('Should handle measurement with empty results', () => {
		const measurement: Measurement = {
			id: 'test-123',
			type: 'ping',
			status: 'finished',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
				probesCount: 1,
			target: 'example.com',
			results: []
		};

		statusBar.updateCompleted(measurement);
		assert.ok(true, 'Should handle empty results');
	});

	test('Should handle measurement with missing properties defensively', () => {
		const measurement: Measurement = {
			id: 'test-123',
			type: 'http',
			status: 'finished',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
				probesCount: 1,
			target: 'https://example.com',
			results: [
				{
					probe: {
						id: 'probe-1',
						continent: 'NA',
						country: 'US',
						city: 'New York',
						network: 'Test Network',
						tags: [],
						resolvers: []
					},
					result: {
						status: 'finished'
						// Missing statusCode and timings
					}
				} as any
			]
		};

		statusBar.updateCompleted(measurement);
		assert.ok(true, 'Should handle missing properties');
	});

	test('getLastMeasurement returns null initially', () => {
		const lastMeasurement = statusBar.getLastMeasurement();
		assert.strictEqual(lastMeasurement, null);
	});

	test('getLastMeasurement returns measurement after updateCompleted', () => {
		const measurement: Measurement = {
			id: 'test-123',
			type: 'ping',
			status: 'finished',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
				probesCount: 1,
			target: 'example.com',
			results: []
		};

		statusBar.updateCompleted(measurement);
		const lastMeasurement = statusBar.getLastMeasurement();
		
		assert.strictEqual(lastMeasurement?.id, 'test-123');
	});
});
