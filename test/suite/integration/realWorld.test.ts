import * as assert from 'assert';
import packageJson from '../../../package.json';

type PackageJson = {
	contributes?: {
		commands?: Array<{ command: string }>;
		views?: Record<string, Array<{ id: string }>>;
		viewsContainers?: Record<string, Array<{ id: string }>>;
		configuration?: {
			properties?: Record<string, { default?: unknown }>;
		};
		menus?: Record<string, Array<{ command?: string }>>;
	};
};

const pkg = packageJson as unknown as PackageJson;

suite('Real-World Integration Tests', () => {
	test('Command palette contributions include core commands', () => {
		const commandIds = new Set(pkg.contributes?.commands?.map(cmd => cmd.command));
		const expectedCommands = [
			'globalping.runNewTest',
			'globalping.runLastTest',
			'globalping.viewHistory',
			'globalping.openSettings',
			'globalping.setApiToken',
			'globalping.removeApiToken'
		];

		expectedCommands.forEach(command => {
			assert.ok(
				commandIds.has(command),
				`Command ${command} should be declared in package.json`
			);
		});
	});

	test('Context menu commands are registered', () => {
		const menuCommands = new Set(
			pkg.contributes?.menus?.['globalping.contextMenu']?.map(item => item.command) ?? []
		);
		const expected = [
			'globalping.contextTest.ping',
			'globalping.contextTest.http',
			'globalping.contextTest.dns',
			'globalping.contextTest.traceroute',
			'globalping.contextTest.mtr'
		];

		expected.forEach(command => {
			assert.ok(
				menuCommands.has(command),
				`Context command ${command} should be declared`
			);
		});
	});

	test('Required views are contributed', () => {
		const views = pkg.contributes?.views?.globalping?.map(view => view.id) ?? [];
		const viewContainers =
			pkg.contributes?.viewsContainers?.activitybar?.map(container => container.id) ?? [];

		assert.ok(viewContainers.includes('globalping'), 'Activity bar container should exist');
		const expectedViewIds = [
			'globalping.testRunner',
			'globalping.history',
			'globalping.savedTests',
			'globalping.authentication'
		];

		expectedViewIds.forEach(viewId => {
			assert.ok(views.includes(viewId), `View ${viewId} should be contributed`);
		});
	});

	test('Configuration defaults match documentation', () => {
		const properties = pkg.contributes?.configuration?.properties ?? {};

		const defaultLocation = properties['globalping.defaultLocation']?.default;
		assert.strictEqual(defaultLocation, 'world', 'Default location should be world');

		const defaultLimit = properties['globalping.defaultLimit']?.default;
		assert.strictEqual(defaultLimit, 3, 'Default probe limit should be 3');

		const inProgress = properties['globalping.inProgressUpdates']?.default;
		assert.strictEqual(inProgress, true, 'In-progress updates should be enabled by default');

		const rawResults = properties['globalping.rawResults']?.default;
		assert.strictEqual(rawResults, false, 'Raw results should be disabled by default');
	});

	test('Authentication panel commands exist', () => {
		const commandIds = new Set(pkg.contributes?.commands?.map(cmd => cmd.command));
		const required = ['globalping.openSettings', 'globalping.setApiToken', 'globalping.removeApiToken'];

		required.forEach(command => {
			assert.ok(commandIds.has(command), `Authentication command ${command} should exist`);
		});
	});

	test('History workflow commands are declared', () => {
		const commandIds = new Set(pkg.contributes?.commands?.map(cmd => cmd.command));
		const required = [
			'globalping.viewHistory',
			'globalping.openHistoryResult',
			'globalping.rerunHistoryTest',
			'globalping.clearHistory'
		];

		required.forEach(command => {
			assert.ok(commandIds.has(command), `History command ${command} should exist`);
		});
	});
});

