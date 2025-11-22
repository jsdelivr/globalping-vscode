/**
 * Test Suite Index
 * 
 * Discovers and runs all test files in the test suite.
 */

import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export function run(): Promise<void> {
	// Add warning hook to catch DisposableStore issues during testing
	process.on('warning', (warning) => {
		if (warning.message?.includes('DisposableStore')) {
			console.error('\n⚠️  DisposableStore Warning Detected:');
			console.error('Message:', warning.message);
			console.error('Stack:', warning.stack);
			console.error('---\n');
		}
	});

	// Add unhandled rejection handler
	process.on('unhandledRejection', (reason, promise) => {
		console.error('\n❌ Unhandled Promise Rejection:');
		console.error('Reason:', reason);
		console.error('Promise:', promise);
		console.error('---\n');
	});

	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
		timeout: 30000 // 30 seconds for integration tests
	});

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((resolve, reject) => {
		glob('**/**.test.js', { cwd: testsRoot }).then((files: string[]) => {
			if (files.length === 0) {
				console.warn('No test files found!');
				return resolve();
			}

			// Add files to the test suite
			files.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));

			try {
				// Run the mocha test
				mocha.run((failures: number) => {
					if (failures > 0) {
						reject(new Error(`${failures} tests failed.`));
					} else {
						resolve();
					}
				});
			} catch (err) {
				console.error(err);
				reject(err);
			}
		}).catch((err: any) => {
			reject(err);
		});
	});
}

