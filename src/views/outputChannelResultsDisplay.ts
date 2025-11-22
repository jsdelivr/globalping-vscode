/**
 * Output Channel Results Display
 * 
 * Displays test results in a non-intrusive output channel at the bottom of VS Code.
 * This provides instant feedback without stealing focus from the code editor.
 */

import * as vscode from 'vscode';
import { MeasurementResponse as Measurement } from 'globalping';
import { FormatterFactory } from '../formatters/formatterFactory';

export class OutputChannelResultsDisplay {
	private outputChannel: vscode.OutputChannel;
	private formatterFactory: FormatterFactory;

	constructor() {
		this.outputChannel = vscode.window.createOutputChannel('Globalping Results');
		this.formatterFactory = new FormatterFactory();
	}

	/**
	 * Display measurement results in the output channel
	 */
	public displayResults(measurement: Measurement, raw: boolean = false): void {
		// Clear previous results to show only the latest test
		this.outputChannel.clear();

		// Format and display results using existing formatter
		const formattedResults = this.formatterFactory.format(measurement, raw);

		// Use append() instead of appendLine() to avoid double newlines
		// since formatters already include newlines via join('\n')
		this.outputChannel.append(formattedResults);

		// Show the output channel without stealing focus from the editor
		this.outputChannel.show(true);
	}

	/**
	 * Clear the output channel
	 */
	public clear(): void {
		this.outputChannel.clear();
	}

	/**
	 * Show the output channel
	 */
	public show(): void {
		this.outputChannel.show(true);
	}

	/**
	 * Dispose of the output channel
	 */
	public dispose(): void {
		this.outputChannel.dispose();
	}
}

