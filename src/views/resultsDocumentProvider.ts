/**
 * Results Document Provider
 * 
 * Virtual document provider for displaying formatted test results in read-only editor tabs.
 */

import * as vscode from 'vscode';
import { MeasurementResponse as Measurement } from 'globalping';
import { FormatterFactory } from '../formatters/formatterFactory';

export class ResultsDocumentProvider implements vscode.TextDocumentContentProvider {
	private static scheme = 'globalping-results';
	private measurements: Map<string, Measurement> = new Map();
	private formatterFactory: FormatterFactory;

	private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
	readonly onDidChange = this._onDidChange.event;

	constructor() {
		this.formatterFactory = new FormatterFactory();
	}

	/**
	 * Provide document content
	 */
	provideTextDocumentContent(uri: vscode.Uri): string {
		const measurementId = this.extractMeasurementId(uri);
		const measurement = this.measurements.get(measurementId);

		if (!measurement) {
			return `No results found for measurement: ${measurementId}`;
		}

		return this.formatterFactory.format(measurement);
	}

	/**
	 * Store measurement for display
	 */
	public storeMeasurement(measurement: Measurement): void {
		this.measurements.set(measurement.id, measurement);
	}

	/**
	 * Create URI for measurement
	 */
	public static createUri(measurement: Measurement): vscode.Uri {
		return vscode.Uri.parse(
			`${ResultsDocumentProvider.scheme}:${measurement.type}-${measurement.id}.txt`
		);
	}

	/**
	 * Extract measurement ID from URI
	 */
	private extractMeasurementId(uri: vscode.Uri): string {
		// URI format: globalping-results:type-id.txt
		const path = uri.path;
		const parts = path.split('-');
		// Remove .txt extension
		const idWithExt = parts.slice(1).join('-');
		return idWithExt.replace('.txt', '');
	}

	/**
	 * Register provider
	 */
	public static register(context: vscode.ExtensionContext): ResultsDocumentProvider {
		const provider = new ResultsDocumentProvider();
		
		context.subscriptions.push(
			vscode.workspace.registerTextDocumentContentProvider(
				ResultsDocumentProvider.scheme,
				provider
			)
		);

		return provider;
	}

	/**
	 * Get scheme
	 */
	public static getScheme(): string {
		return ResultsDocumentProvider.scheme;
	}
}

