/**
 * Mock Helpers
 *
 * Reusable mock objects and helper functions for testing.
 * Standardizes mock patterns across all test files.
 */

import * as vscode from 'vscode';
import { MeasurementType, MeasurementResponse as Measurement, Probe } from 'globalping';


/**
 * Create a mock Globalping client constructor (v0.2.0 API)
 */
export function createMockGlobalpingConstructor(options?: {
	shouldFailInit?: boolean;
	shouldFailCreate?: boolean;
	shouldFailGet?: boolean;
	shouldFailAwait?: boolean;
	customResponses?: any;
}) {
	return function(this: any, clientOptions: any) {
		if (options?.shouldFailInit) {
			throw new Error('Mock initialization failure');
		}

		this.options = clientOptions;

		// createMeasurement
		this.createMeasurement = async (config: any) => {
			if (options?.shouldFailCreate) {
				if (options.customResponses?.create) {
					throw options.customResponses.create;
				}
				throw new Error('Mock create failure');
			}
			return {
				data: options?.customResponses?.create || {
					id: 'test-measurement-id',
					type: config.type,
					status: 'in-progress',
					createdAt: new Date().toISOString(),
					probesCount: config.limit || 1
				},
				ok: true
			};
		};

		// getMeasurement
		this.getMeasurement = async (id: string) => {
			if (options?.shouldFailGet) {
				throw new Error('Mock get failure');
			}
			return {
				data: options?.customResponses?.get || {
					id,
					type: 'ping',
					target: 'example.com',
					status: 'finished',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					probesCount: 1,
					results: []
				},
				ok: true
			};
		};

		// awaitMeasurement
		this.awaitMeasurement = async (id: string) => {
			if (options?.shouldFailAwait) {
				if (options.customResponses?.await) {
					throw options.customResponses.await;
				}
				throw new Error('Mock await failure');
			}
			await new Promise(resolve => setTimeout(resolve, 50));
			return {
				data: options?.customResponses?.await || {
					id,
					type: 'ping',
					target: 'example.com',
					status: 'finished',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					probesCount: 1,
					results: [
						{
							probe: { city: 'Test', country: 'US', network: 'Test Network' },
							result: { status: 'finished', stats: { min: 10, avg: 15, max: 20 } }
						}
					]
				},
				ok: true
			};
		};

		// listProbes
		this.listProbes = async () => {
			return {
				data: options?.customResponses?.probes || [],
				ok: true
			};
		};

		// getLimits
		this.getLimits = async () => {
			return {
				data: options?.customResponses?.limits !== undefined
					? options.customResponses.limits
					: {
						rateLimit: {
							measurements: {
								create: {
									type: 'ip',
									limit: 100,
									remaining: 95,
									reset: Date.now() / 1000 + 3600
								}
							}
						},
						credits: {
							remaining: 50000  // Default mock credits
						}
					},
				ok: true
			};
		};
	};
}

/**
 * Create a mock VS Code ExtensionContext
 */
export function createMockExtensionContext(options?: {
	hasToken?: boolean;
	token?: string;
	globalStateData?: Map<string, any>;
	workspaceStateData?: Map<string, any>;
}): vscode.ExtensionContext {
	const globalStateData = options?.globalStateData || new Map();
	const workspaceStateData = options?.workspaceStateData || new Map();

	const mockContext = {
		globalState: {
			get: (key: string, defaultValue?: any) => globalStateData.get(key) ?? defaultValue,
			update: async (key: string, value: any) => {
				globalStateData.set(key, value);
			},
			keys: () => Array.from(globalStateData.keys()),
			setKeysForSync: () => {}
		},
		workspaceState: {
			get: (key: string, defaultValue?: any) => workspaceStateData.get(key) ?? defaultValue,
			update: async (key: string, value: any) => {
				workspaceStateData.set(key, value);
			},
			keys: () => Array.from(workspaceStateData.keys())
		},
		secrets: {
			get: async (key: string) => {
				if (key === 'globalping.authToken') {
					return options?.hasToken ? (options?.token || 'test-token') : undefined;
				}
				return undefined;
			},
			store: async (_key: string, _value: string) => {},
			delete: async (_key: string) => {},
			onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event
		},
		subscriptions: [],
		extensionPath: '/test/path',
		extensionUri: vscode.Uri.parse('file:///test'),
		storagePath: '/test/storage',
		globalStoragePath: '/test/globalStorage',
		logPath: '/test/log',
		extensionMode: vscode.ExtensionMode.Test,
		extension: {} as any,
		environmentVariableCollection: {} as any,
		globalStorageUri: vscode.Uri.parse('file:///test/globalStorage'),
		logUri: vscode.Uri.parse('file:///test/log'),
		storageUri: vscode.Uri.parse('file:///test/storage')
	} as any;

	return mockContext;
}

/**
 * Create a mock measurement with customizable properties
 */
export function createMockMeasurement(options?: {
	type?: MeasurementType;
	target?: string;
	status?: 'in-progress' | 'finished';
	resultCount?: number;
	includeStats?: boolean;
	includeProbeLocation?: boolean;
	nestedResult?: boolean;
}): Measurement {
	const type = options?.type || 'ping';
	const target = options?.target || 'example.com';
	const status = options?.status || 'finished';
	const resultCount = options?.resultCount ?? 3;
	const includeStats = options?.includeStats ?? true;
	const includeProbeLocation = options?.includeProbeLocation ?? true;
	const nestedResult = options?.nestedResult ?? false;

	const results: any[] = [];
	for (let i = 0; i < resultCount; i++) {
		const probe: any = {};
		if (includeProbeLocation) {
			probe.city = 'TestCity';
			probe.country = 'US';
			probe.continent = 'NA';
			probe.network = 'Test Network';
			probe.asn = 12345;
		}

		let result: any = {
			status: 'finished'
		};

		if (includeStats && type === 'ping') {
			result.stats = {
				min: 10 + i,
				avg: 15 + i,
				max: 20 + i,
				total: 3,
				rcv: 3,
				drop: 0,
				loss: 0
			};
		}

		// Simulate nested result structure from API
		const resultObj: any = {
			probe
		};

		if (nestedResult) {
			resultObj.result = result;
		} else {
			Object.assign(resultObj, result);
		}

		results.push(resultObj);
	}

	return {
		id: 'test-measurement-id',
		type,
		target,
		status,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		probesCount: resultCount,
		results
	};
}

/**
 * Create a mock probe
 */
export function createMockProbe(options?: {
	city?: string;
	country?: string;
	continent?: string;
	network?: string;
	asn?: number;
}): Probe {
	return {
		version: '1.0.0',
		location: {
			continent: (options?.continent || 'NA') as any,
			region: 'Northern America',
			country: (options?.country || 'US') as any,
			state: 'CA' as any,
			city: (options?.city || 'San Francisco') as any,
			asn: options?.asn || 0,
			network: (options?.network || 'Test Network') as any,
			latitude: 0,
			longitude: 0
		},
		tags: [],
		resolvers: []
	};
}

/**
 * Install mock Globalping library
 */
export function installMockGlobalping(mockConstructor: any): any {
	const globalpingModule = require('globalping');
	const originalGlobalping = globalpingModule.Globalping;
	globalpingModule.Globalping = mockConstructor;
	return originalGlobalping;
}

/**
 * Restore original Globalping library
 */
export function restoreMockGlobalping(originalGlobalping: any): void {
	if (originalGlobalping) {
		const globalpingModule = require('globalping');
		globalpingModule.Globalping = originalGlobalping;
	}
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
	condition: () => boolean | Promise<boolean>,
	timeout: number = 5000,
	interval: number = 100
): Promise<void> {
	const startTime = Date.now();
	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return;
		}
		await new Promise(resolve => setTimeout(resolve, interval));
	}
	throw new Error('Timeout waiting for condition');
}

/**
 * Sleep for a given amount of time
 */
export function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Options for withMockGlobalping helper
 */
export interface MockGlobalpingOptions {
	shouldFailInit?: boolean;
	shouldFailCreate?: boolean;
	shouldFailGet?: boolean;
	shouldFailAwait?: boolean;
	customResponses?: {
		create?: any;
		get?: any;
		await?: any;
		probes?: any;
		limits?: any;
	};
}

/**
 * Centralized Globalping mocking helper
 * 
 * Installs mock Globalping constructor before test execution,
 * automatically restores original after completion.
 * 
 * Usage:
 * ```typescript
 * await withMockGlobalping({}, async () => {
 *   const client = new GlobalpingClient(...);
 *   // Test code here
 * });
 * ```
 */
export async function withMockGlobalping<T>(
	options: MockGlobalpingOptions,
	testFn: () => Promise<T> | T
): Promise<T> {
	const globalpingModule = require('globalping');
	const originalGlobalping = globalpingModule.Globalping;
	
	try {
		// Install mock constructor
		const mockConstructor = createMockGlobalpingConstructor(options);
		globalpingModule.Globalping = mockConstructor;
		
		// Execute test function
		const result = await testFn();
		
		return result;
	} finally {
		// Always restore original
		globalpingModule.Globalping = originalGlobalping;
	}
}

/**
 * Synchronous version of withMockGlobalping for suite-level setup
 * Returns cleanup function that must be called in teardown
 */
export function setupMockGlobalping(options: MockGlobalpingOptions): () => void {
	const globalpingModule = require('globalping');
	const originalGlobalping = globalpingModule.Globalping;
	
	// Install mock constructor
	const mockConstructor = createMockGlobalpingConstructor(options);
	globalpingModule.Globalping = mockConstructor;
	
	// Return cleanup function
	return () => {
		globalpingModule.Globalping = originalGlobalping;
	};
}

