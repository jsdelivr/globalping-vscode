/**
 * Test Runner
 * 
 * Runs integration tests in a real VS Code environment using @vscode/test-electron.
 * Auto-detects environment (CI, WSL2, local) and adjusts configuration accordingly.
 */

import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
	try {
		// The folder containing the Extension Manifest package.json
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		// The path to the extension test script
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		// Download VS Code, unzip it and run the integration test
		await runTests({ 
			extensionDevelopmentPath, 
			extensionTestsPath,
			launchArgs: [
				'--disable-extensions',  // Disable other extensions during testing
				'--disable-gpu'          // Disable GPU (helps with WSL2/CI)
			]
		});

		process.exit(0);
	} catch (err) {
		console.error('Failed to run tests');
		console.error(err);
		process.exit(1);
	}
}

main();
