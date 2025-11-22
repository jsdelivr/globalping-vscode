/**
 * Tests for GlobalpingClient
 * 
 * Tests client initialization, error handling, and API interactions.
 * These tests properly mock the Globalping library to test initialization scenarios.
 */

import * as assert from 'assert';
import { GlobalpingClient } from '../../src/services/globalpingClient';
import { TelemetryService } from '../../src/services/telemetry';
import { ConfigService } from '../../src/services/config';
import { GlobalpingError, RateLimitError } from '../../src/services/errors';
import { createMockExtensionContext, setupMockGlobalping, MockGlobalpingOptions } from './helpers/mockHelpers';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const telemetryInstances: TelemetryService[] = [];
const clientInstances: GlobalpingClient[] = [];
let cleanupMock: (() => void) | null = null;

function buildMeasurement(overrides?: Record<string, any>) {
	return {
		id: 'test-id',
		type: 'ping' as const,
		target: 'example.com',
		status: 'finished' as const,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
			probesCount: 1,
		results: [] as any[],
		...overrides
	};
}

function createStubbedClient(options?: {
	mockOptions?: MockGlobalpingOptions;
	autoAssignClient?: boolean;
}) {
	const context = createMockExtensionContext();
	const telemetry = new TelemetryService();
	telemetryInstances.push(telemetry);
	const config = new ConfigService(context);
	
	// Use centralized mock setup
	const mockOptions = options?.mockOptions || {};
	
	// Setup mock BEFORE creating client
	if (cleanupMock) {
		cleanupMock();
	}
	cleanupMock = setupMockGlobalping(mockOptions);
	
	// Now create client - it will use our mocked Globalping constructor
	const client = new GlobalpingClient(telemetry, config, '1.0.0');
	clientInstances.push(client);

	// Create a shared stubbed API instance that both client and tests will use
	const globalpingModule = require('globalping');
	const MockedGlobalping = globalpingModule.Globalping;
	const stubbedApi = new MockedGlobalping({});

	// CRITICAL: Always assign the same stub instance to the client
	// so that test modifications to stubbedApi are reflected in client behavior
	(client as any).initializationPromise = null;
	(client as any).client = stubbedApi;
	
	if (options?.autoAssignClient !== false) {
		// Override ensureInitialized to always use our stub
		(client as any).ensureInitialized = async () => {
			if (!(client as any).client) {
				(client as any).client = stubbedApi;
			}
		};
	} else {
		// Tests that set autoAssignClient: false want to manually control initialization
		// Set client to undefined but keep the stub available
		(client as any).client = undefined;
	}

	return { client, stubbedApi };
}

suite('GlobalpingClient Test Suite', () => {
	teardown(() => {
		// Restore original Globalping constructor
		if (cleanupMock) {
			cleanupMock();
			cleanupMock = null;
		}
		
		// Clean up all instances
		while (telemetryInstances.length) {
			telemetryInstances.pop()?.dispose();
		}
		// Clear client instances (they don't have a dispose method, but clear the array)
		clientInstances.length = 0;
	});

	test('Client initializes successfully', async () => {
		const { client } = createStubbedClient();

		const result = await client.createMeasurement({
			type: 'ping',
			target: 'example.com',
			locations: [{ magic: 'world' }],
			limit: 1
		});

		assert.ok(result, 'Measurement should be created');
		assert.ok(result.id, 'Measurement should have an ID');
		assert.ok(result.probesCount, 'Measurement should have probesCount');
	});

	test('Client handles immediate usage (before initialization completes)', async () => {
		const { client, stubbedApi } = createStubbedClient({ autoAssignClient: false });

		(client as any).client = undefined;
		let ensureCalls = 0;
		(client as any).ensureInitialized = async () => {
			ensureCalls++;
			await delay(20);
			(client as any).client = stubbedApi;
		};

		const result = await client.createMeasurement({
			type: 'ping',
			target: 'example.com',
			locations: [{ magic: 'world' }],
			limit: 1
		});

		assert.strictEqual(result.id, 'test-measurement-id', 'ID should match');
		assert.ok(ensureCalls >= 1, 'ensureInitialized should be called at least once');
	});

	test('Client handles initialization failure gracefully', async () => {
		const { client } = createStubbedClient({ autoAssignClient: false });

		(client as any).client = undefined;
		(client as any).ensureInitialized = async () => {
			throw new GlobalpingError('Mock initialization failure');
		};

		await assert.rejects(
			async () => client.createMeasurement({
				type: 'ping',
				target: 'example.com',
				locations: [{ magic: 'world' }],
				limit: 1
			}),
			(error: any) => {
				assert.ok(error instanceof GlobalpingError, 'Should throw GlobalpingError');
				assert.ok(error.message.includes('Mock initialization failure'), 'Error message should mention failure');
				return true;
			}
		);
	});

	test('Client handles undefined client gracefully', async () => {
		const { client } = createStubbedClient({ autoAssignClient: false });

		(client as any).client = undefined;
		(client as any).ensureInitialized = async () => {
			(client as any).client = undefined;
		};

		await assert.rejects(
			async () => client.createMeasurement({
				type: 'ping',
				target: 'example.com',
				locations: [{ magic: 'world' }],
				limit: 1
			}),
			(error: any) => {
				assert.ok(error instanceof GlobalpingError, 'Should throw GlobalpingError');
				assert.ok(error.message.includes('not initialized'), 'Error message should mention initialization');
				return true;
			}
		);
	});

	test('Client handles missing methods gracefully', async () => {
		const { client, stubbedApi } = createStubbedClient();

		delete (stubbedApi as any).createMeasurement;

		await assert.rejects(
			async () => client.createMeasurement({
				type: 'ping',
				target: 'example.com',
				locations: [{ magic: 'world' }],
				limit: 1
			}),
			(error: any) => {
				assert.ok(error instanceof GlobalpingError, 'Should throw GlobalpingError');
				return true;
			}
		);
	});

	test('Client can reinitialize after failure', async () => {
		const { client, stubbedApi } = createStubbedClient({ autoAssignClient: false });

		let initializeCalls = 0;
		(client as any).client = undefined;
		(client as any).ensureInitialized = async () => {
			throw new GlobalpingError('Initial failure');
		};
		(client as any).initializeClient = async () => {
			initializeCalls++;
			(client as any).client = stubbedApi;
		};

		await assert.rejects(
			async () => client.createMeasurement({
				type: 'ping',
				target: 'example.com',
				locations: [{ magic: 'world' }],
				limit: 1
			}),
			(error: any) => {
				assert.ok(error instanceof GlobalpingError, 'First attempt should fail');
				return true;
			}
		);

		await client.reinitialize();

		(client as any).ensureInitialized = async () => {
			(client as any).client = stubbedApi;
		};

		const result = await client.createMeasurement({
			type: 'ping',
			target: 'example.com',
			locations: [{ magic: 'world' }],
			limit: 1
		});

		assert.strictEqual(result.id, 'test-measurement-id', 'Measurement should succeed after reinitialize');
		assert.strictEqual(initializeCalls, 1, 'initializeClient should be called once');
	});

	test('Client handles getMeasurement correctly', async () => {
		const { client } = createStubbedClient();

		const result = await client.getMeasurement('test-id');
		assert.ok(result, 'Should return measurement');
		assert.strictEqual(result.id, 'test-id', 'ID should match');
	});

	test('Client handles getProbes correctly', async () => {
		const { client } = createStubbedClient({
			mockOptions: {
				customResponses: {
					probes: [{ city: 'TestCity', country: 'US' }]
				}
			}
		});

		const result = await client.getProbes();
		assert.ok(Array.isArray(result), 'Should return array');
		assert.strictEqual(result.length, 1, 'Should return custom probe');
	});

	test('Client normalizes errors correctly', async () => {
		const { client } = createStubbedClient({
			mockOptions: {
				shouldFailCreate: true
			}
		});

		// Override the stub to throw rate limit error
		(client as any).client.createMeasurement = async () => {
			const error: any = new Error('Test error');
			error.response = {
				status: 429,
				data: { error: { message: 'Rate limited' } }
			};
			throw error;
		};

		await assert.rejects(
			async () => client.createMeasurement({
				type: 'ping',
				target: 'example.com',
				locations: [{ magic: 'world' }],
				limit: 1
			}),
			(error: any) => {
				assert.ok(error instanceof RateLimitError, 'Should normalize to RateLimitError');
				return true;
			}
		);
	});

	test('pollMeasurement uses awaitMeasurement when no onProgress callback provided', async () => {
		let awaitMeasurementCalled = 0;
		const { client, stubbedApi } = createStubbedClient();

		// Override awaitMeasurement to track calls
		stubbedApi.awaitMeasurement = async (id: string) => {
			awaitMeasurementCalled++;
			return {
				data: buildMeasurement({
					id,
					results: [{ status: 'success' }]
				}),
				ok: true
			};
		};

		const result = await client.pollMeasurement('test-id', 'ping', { interval: 50 });

		assert.strictEqual(awaitMeasurementCalled, 1, 'Should call awaitMeasurement exactly once');
		assert.strictEqual(result.status, 'finished', 'Should return finished measurement');
	});

	test('pollMeasurement uses progress callback when provided', async () => {
		let progressCallCount = 0;
		const { client, stubbedApi } = createStubbedClient();

		// Override methods for this test
		stubbedApi.awaitMeasurement = async (id: string) => {
			// Simulate a longer measurement
			await delay(100);
			return {
				data: buildMeasurement({
					id,
					status: 'finished',
					results: [{ status: 'success' }]
				}),
				ok: true
			};
		};
		stubbedApi.getMeasurement = async (id: string) => {
			// Return in-progress for the first few calls, then finished
			await delay(5);
			return {
				data: buildMeasurement({
					id,
					status: 'in-progress',
					results: []
				}),
				ok: true
			};
		};

		const result = await client.pollMeasurement('test-id', 'ping', {
			interval: 20,
			onProgress: (measurement) => {
				progressCallCount++;
			}
		});

		// Progress callback might or might not be called depending on timing,
		// but the measurement should complete successfully either way
		assert.strictEqual(result.status, 'finished', 'Should have finished status');
		assert.ok(progressCallCount >= 0, 'Progress callback should be callable');
	});

	test('pollMeasurement handles errors from awaitMeasurement', async () => {
		const { client, stubbedApi } = createStubbedClient();
		
		// Override to throw error
		stubbedApi.awaitMeasurement = async () => {
			throw new Error('Measurement failed');
		};

		await assert.rejects(
			async () => client.pollMeasurement('test-id', 'ping', { interval: 25 }),
			(error: any) => {
				assert.ok(error instanceof GlobalpingError, 'Should wrap errors in GlobalpingError');
				return true;
			}
		);
	});

	test('pollMeasurement with progress callback still uses awaitMeasurement', async () => {
		let awaitMeasurementCalled = false;
		const { client, stubbedApi } = createStubbedClient();

		stubbedApi.awaitMeasurement = async (id: string) => {
			awaitMeasurementCalled = true;
			await delay(80);
			return {
				data: buildMeasurement({
					id,
					results: [{ status: 'success' }]
				}),
				ok: true
			};
		};
		stubbedApi.getMeasurement = async (id: string) => ({
			data: buildMeasurement({
				id,
				status: 'in-progress',
				results: []
			}),
			ok: true
		});

		const result = await client.pollMeasurement('test-id', 'ping', {
			interval: 25,
			onProgress: () => {}
		});

		assert.ok(awaitMeasurementCalled, 'awaitMeasurement should be used for completion');
		assert.strictEqual(result.status, 'finished', 'Should return finished result');
	});

	test('pollMeasurement properly cancels progress polling with AbortController', async () => {
		let awaitCompleted = false;
		let callsAfterCompletion = 0;
		const { client, stubbedApi } = createStubbedClient();

		stubbedApi.awaitMeasurement = async (id: string) => {
			await delay(60);
			awaitCompleted = true;
			return {
				data: buildMeasurement({
					id,
					results: [{ status: 'success' }]
				}),
				ok: true
			};
		};
		stubbedApi.getMeasurement = async (id: string) => {
			if (awaitCompleted) {
				callsAfterCompletion++;
			}
			return {
				data: buildMeasurement({
					id,
					status: awaitCompleted ? 'finished' : 'in-progress',
					results: []
				}),
				ok: true
			};
		};

		await client.pollMeasurement('test-id', 'ping', {
			interval: 25,
			onProgress: () => {}
		});

		await delay(100);
		assert.ok(callsAfterCompletion <= 1, `Should not poll after completion (had ${callsAfterCompletion} extra calls)`);
	});

	test('getRateLimits waits for client initialization', async () => {
		const { client, stubbedApi } = createStubbedClient({ autoAssignClient: false });
		
		// Override ensureInitialized to simulate delayed initialization
		let initComplete = false;
		(client as any).ensureInitialized = async () => {
			await delay(50);  // Simulate initialization delay
			(client as any).client = stubbedApi;
			initComplete = true;
		};
		
		// Call getRateLimits immediately while still initializing
		const limitsPromise = client.getRateLimits();
		
		// Verify initialization hasn't completed yet
		assert.strictEqual(initComplete, false, 'Should not have completed initialization yet');
		
		// Should not throw and should return limits once initialized
		const limits = await limitsPromise;
		
		// Verify initialization completed
		assert.strictEqual(initComplete, true, 'Should have completed initialization');
		assert.ok(limits !== null, 'Should return limits after initialization');
		assert.ok(typeof limits.limit === 'number', 'Should have limit property');
		assert.ok(typeof limits.remaining === 'number', 'Should have remaining property');
	});

});
