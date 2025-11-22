/**
 * TestRunner Tests
 *
 * These tests use stubbed GlobalpingClient implementations for determinism.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { TestRunner } from '../../../src/commands/testRunner';
import { GlobalpingClient, PollOptions } from '../../../src/services/globalpingClient';
import { StorageService } from '../../../src/services/storage';
import { TelemetryService } from '../../../src/services/telemetry';
import { ConfigService } from '../../../src/services/config';
import { OutputChannelResultsDisplay } from '../../../src/views/outputChannelResultsDisplay';
import { MeasurementResponse as Measurement } from 'globalping';
import { createMockExtensionContext } from '../helpers/mockHelpers';
import { RateLimitInfo } from '../../../src/types/configuration';

type RunnerContext = {
	runner: TestRunner;
	storage: StorageService;
	telemetry: TelemetryService;
	outputChannel: { displayResults: (measurement: Measurement, raw: boolean) => void; show: () => void };
};

const probeInfo = { city: 'TestCity', country: 'US', network: 'TestNet' } as const;

const baseMeasurement = {
	id: 'measurement-id',
	type: 'ping',
	target: 'example.com',
	status: 'finished',
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
			probesCount: 1,
	results: [
		{ status: 'finished', result: { status: 'finished' }, probe: probeInfo },
		{ status: 'finished', result: { status: 'finished' }, probe: probeInfo },
		{ status: 'finished', result: { status: 'finished' }, probe: probeInfo }
	] as any[]
} as unknown as Measurement;

function createRunner(options?: {
	measurement?: Measurement;
	rateLimits?: RateLimitInfo | null;
	isAuthenticated?: boolean;
	onPoll?: (options?: PollOptions) => void;
}): RunnerContext {
	const measurement = options?.measurement ?? baseMeasurement;
	const rateLimits = options?.rateLimits ?? {
		limit: 100,
		remaining: 90,
		reset: new Date(Date.now() + 3600000),
		isAuthenticated: options?.isAuthenticated ?? false
	};

	const context = createMockExtensionContext();
	const storage = new StorageService(context);
	const telemetry = new TelemetryService();
	const config = new ConfigService(context);
	const outputChannel = {
		displayResults: () => {},
		show: () => {}
	} as unknown as OutputChannelResultsDisplay;

	const clientStub = {
		createMeasurement: async () => ({
			id: measurement.id,
			type: measurement.type,
			status: 'in-progress'
		}),
		pollMeasurement: async (_id: string, _type: string, pollOptions?: PollOptions) => {
			options?.onPoll?.(pollOptions);
			if (pollOptions?.onProgress) {
				pollOptions.onProgress({
					...measurement,
					status: 'in-progress'
				});
			}
			return measurement;
		},
		getRateLimits: async () => rateLimits,
		isAuthenticated: async () => options?.isAuthenticated ?? false
	} as unknown as GlobalpingClient;

	const runner = new TestRunner(clientStub, storage, telemetry, config, outputChannel);
	return { runner, storage, telemetry, outputChannel };
}

let originalWithProgress: typeof vscode.window.withProgress;
let originalInfo: typeof vscode.window.showInformationMessage;
let originalWarn: typeof vscode.window.showWarningMessage;
let originalError: typeof vscode.window.showErrorMessage;

suiteSetup(() => {
	originalWithProgress = vscode.window.withProgress;
	originalInfo = vscode.window.showInformationMessage;
	originalWarn = vscode.window.showWarningMessage;
	originalError = vscode.window.showErrorMessage;

	(vscode.window as any).withProgress = async (_options: any, task: any) => task({ report: () => {} }, {} as any);
	(vscode.window as any).showInformationMessage = async () => undefined;
	(vscode.window as any).showWarningMessage = async () => undefined;
	(vscode.window as any).showErrorMessage = async () => undefined;
});

suiteTeardown(() => {
	vscode.window.withProgress = originalWithProgress;
	vscode.window.showInformationMessage = originalInfo;
	vscode.window.showWarningMessage = originalWarn;
	vscode.window.showErrorMessage = originalError;
});

suite('TestRunner', () => {
	test('executes test and stores history entry', async () => {
		const { runner, storage, telemetry } = createRunner();
		const measurement = await runner.execute({
			type: 'ping',
			target: 'example.com',
			locations: [{ magic: 'world' }],
			limit: 3,
			inProgressUpdates: false
		});

		const history = await storage.getHistory();
		telemetry.dispose();

		assert.strictEqual(measurement.status, 'finished');
		assert.strictEqual(history.length, 1);
		assert.strictEqual(history[0].status, 'success');
	});

	test('marks history entry as partial when probes fail', async () => {
		const measurement = {
			...baseMeasurement,
			results: [
		{ status: 'finished', result: { status: 'finished' }, probe: probeInfo },
		{ status: 'failed', result: { status: 'failed' }, probe: probeInfo }
			]
		} as unknown as Measurement;

		const { runner, storage, telemetry } = createRunner({ measurement });
		await runner.execute({
			type: 'ping',
			target: 'example.com',
			locations: [{ magic: 'world' }],
			limit: 2,
			inProgressUpdates: false
		});

		const history = await storage.getHistory();
		telemetry.dispose();

		assert.strictEqual(history[0].status, 'partial');
	});

	test('handles rate limit check failures gracefully', async () => {
		const { runner, telemetry } = createRunner({ rateLimits: null });

		await assert.doesNotReject(runner.execute({
			type: 'ping',
			target: 'example.com',
			locations: [{ magic: 'world' }],
			limit: 1,
			inProgressUpdates: false
		}));

		telemetry.dispose();
	});

	test('executeAndShowResults displays measurement output', async () => {
		let displayed: Measurement | undefined;
		const ctx = createRunner();
		ctx.outputChannel.displayResults = (measurement) => {
			displayed = measurement;
		};

		await ctx.runner.executeAndShowResults({
			type: 'ping',
			target: 'example.com',
			locations: [{ magic: 'world' }],
			limit: 1,
			inProgressUpdates: false
		});

		ctx.telemetry.dispose();
		assert.ok(displayed, 'Output channel should receive measurement');
	});

	test('inProgressUpdates passes onProgress callback to client', async () => {
		let onProgressSupplied = false;
		const { runner, telemetry } = createRunner({
			onPoll: (options) => {
				onProgressSupplied = typeof options?.onProgress === 'function';
			}
		});

		await runner.execute({
			type: 'ping',
			target: 'example.com',
			locations: [{ magic: 'world' }],
			limit: 1,
			inProgressUpdates: true
		});

		telemetry.dispose();
		assert.ok(onProgressSupplied, 'Poll options should include onProgress callback');
	});
});
