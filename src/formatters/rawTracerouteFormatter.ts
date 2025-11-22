/**
 * Raw Traceroute Formatter
 *
 * Formats traceroute/MTR test results in CLI-style output using the API's rawOutput field.
 */

import { MeasurementResponse as Measurement } from 'globalping';
import { IFormatter } from './formatterFactory';
import { formatRawLocation } from './formatterUtils';

export class RawTracerouteFormatter implements IFormatter {
	public format(measurement: Measurement): string {
		const lines: string[] = [];

		// Results for each probe
		measurement.results.forEach((result, index) => {
			// Add separator between probes (except before first)
			if (index > 0) {
				lines.push('');
			}

			// Location header (matches Globalping CLI format)
			const locationHeader = formatRawLocation(result.probe);
			lines.push(locationHeader);

			// Raw CLI output from API
			if (result.result.rawOutput) {
				lines.push(result.result.rawOutput);
			} else if (result.result.status === 'failed') {
				// Fallback for failed probes without rawOutput
				const error = (result.result as any).error || 'Unknown error';
				lines.push(`[Probe failed: ${error}]`);
			} else {
				lines.push('[No output available]');
			}
		});

		return lines.join('\n');
	}
}

