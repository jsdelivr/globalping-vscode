/**
 * Traceroute Formatter
 *
 * Formats traceroute and MTR test results into a readable format.
 */

import { MeasurementResponse as Measurement, FinishedTracerouteTestResult, FinishedMtrTestResult } from 'globalping';
import { IFormatter } from './formatterFactory';
import { getVisualWidth, padRight, padLeft, formatLocation } from './formatterUtils';

export class TracerouteFormatter implements IFormatter {
	public format(measurement: Measurement): string {
		const lines: string[] = [];

		// Simple header
		const testType = measurement.type === 'mtr' ? 'MTR' : 'TRACEROUTE';
		lines.push(`${testType} ${measurement.target}`);
		lines.push('');

		// Calculate dynamic column widths for addresses and hostnames
		let maxAddressWidth = 7; // Minimum width for 'Address'
		let maxHostnameWidth = 8; // Minimum width for 'Hostname'

		measurement.results.forEach(result => {
			if (result.result.status === 'finished') {
				const traceResult = result.result as FinishedTracerouteTestResult | FinishedMtrTestResult;
				if (traceResult.hops && traceResult.hops.length > 0) {
					traceResult.hops.forEach(hop => {
						const address = hop.resolvedAddress || '*';
						const hostname = hop.resolvedHostname || '';
						maxAddressWidth = Math.max(maxAddressWidth, getVisualWidth(address));
						maxHostnameWidth = Math.max(maxHostnameWidth, getVisualWidth(hostname));
					});
				}
			}
		});

		// Add padding and cap at reasonable maximums
		maxAddressWidth = Math.min(maxAddressWidth + 2, 39); // IPv6 max is 39 chars
		maxHostnameWidth = Math.min(maxHostnameWidth + 2, 50);

		// Results for each probe
		measurement.results.forEach((result, index) => {
			const probe = result.probe;
			const location = formatLocation(probe);

			lines.push(`📍 ${location}`);
			lines.push('');

			if (result.result.status === 'finished') {
				const traceResult = result.result as FinishedTracerouteTestResult | FinishedMtrTestResult;
				if (traceResult.hops && traceResult.hops.length > 0) {
					traceResult.hops.forEach((hop, hopIndex) => {
						const hopNum = padLeft(String(hopIndex + 1), 3);

						let timings = '---';
						if (hop.timings && Array.isArray(hop.timings) && hop.timings.length > 0) {
							const validTimings = hop.timings
								// Defensive: filter null timings AND check if rtt exists
								.filter(t => t !== null && t !== undefined && t.rtt !== undefined && t.rtt !== null)
								.map(t => `${t.rtt.toFixed(1)}ms`);
							if (validTimings.length > 0) {
								timings = validTimings.join('  ');
							}
						}

						const address = hop.resolvedAddress || '*';
						const hostname = hop.resolvedHostname || '';

						lines.push(`  ${hopNum}  ${padRight(address, maxAddressWidth)}  ${padRight(hostname, maxHostnameWidth)}  ${timings}`);
					});
				} else {
					lines.push('  ❌ Traceroute failed');
				}
			} else {
				lines.push(`  ❌ ${result.result.status}`);
			}

			if (index < measurement.results.length - 1) {
				lines.push('');
				lines.push('───────────────────────────────────────────────────────────────');
				lines.push('');
			}
		});

		lines.push('');
		lines.push('');

		// Metadata section - compact 2-line format
		const successCount = measurement.results.filter(r => r.result.status === 'finished').length;
		const failCount = measurement.results.length - successCount;
		const status = failCount === 0 ? '✅' : failCount < measurement.results.length ? '⚠️' : '❌';

		lines.push(`📋 Target: ${measurement.target} | Probes: ${measurement.results.length} | Status: ${status} ${successCount} succeeded, ${failCount} failed | Executed: ${new Date(measurement.createdAt).toUTCString()}`);

		// Statistics
		if (successCount > 0) {
			lines.push(`📊 Success Rate: ${((successCount / measurement.results.length) * 100).toFixed(1)}% (${successCount}/${measurement.results.length})`);
		}

		return lines.join('\n');
	}
}

