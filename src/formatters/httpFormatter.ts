/**
 * HTTP Formatter
 *
 * Formats HTTP test results into a readable table format.
 */

import { MeasurementResponse as Measurement, FinishedHttpTestResult } from 'globalping';
import { IFormatter } from './formatterFactory';
import { getVisualWidth, padRight, formatLocation } from './formatterUtils';

export class HttpFormatter implements IFormatter {
	public format(measurement: Measurement): string {
		const lines: string[] = [];

		// Simple header
		lines.push(`HTTP ${measurement.target}`);
		lines.push('');

		// Sort: failed first, then by total time
		const sortedResults = [...measurement.results].sort((a, b) => {
			const aResult = a.result;
			const bResult = b.result;
			if (aResult.status === 'failed' && bResult.status !== 'failed') {
				return -1;
			}
			if (aResult.status !== 'failed' && bResult.status === 'failed') {
				return 1;
			}
			if (aResult.status === 'finished' && bResult.status === 'finished') {
				const aTimings = (aResult as FinishedHttpTestResult).timings;
				const bTimings = (bResult as FinishedHttpTestResult).timings;
				return (aTimings?.total || 0) - (bTimings?.total || 0);
			}
			return 0;
		});

		// Calculate dynamic column width for Location based on actual content
		let maxLocationWidth = getVisualWidth('Location');
		sortedResults.forEach(result => {
			const location = formatLocation(result.probe);
			maxLocationWidth = Math.max(maxLocationWidth, getVisualWidth(location));
		});
		// Add padding and cap at reasonable maximum
		maxLocationWidth = Math.min(maxLocationWidth + 2, 50);

		// Fixed widths for other columns
		const statusWidth = 8;
		const totalWidth = 7;
		const ttfbWidth = 8;
		const dnsWidth = 7;
		const tlsWidth = 8;

		// Build dynamic table borders
		const topBorder = '┌─' + '─'.repeat(maxLocationWidth) + '─┬─' + '─'.repeat(statusWidth) + '─┬─' + '─'.repeat(totalWidth) + '─┬─' + '─'.repeat(ttfbWidth) + '─┬─' + '─'.repeat(dnsWidth) + '─┬─' + '─'.repeat(tlsWidth) + '─┐';
		const middleBorder = '├─' + '─'.repeat(maxLocationWidth) + '─┼─' + '─'.repeat(statusWidth) + '─┼─' + '─'.repeat(totalWidth) + '─┼─' + '─'.repeat(ttfbWidth) + '─┼─' + '─'.repeat(dnsWidth) + '─┼─' + '─'.repeat(tlsWidth) + '─┤';
		const bottomBorder = '└─' + '─'.repeat(maxLocationWidth) + '─┴─' + '─'.repeat(statusWidth) + '─┴─' + '─'.repeat(totalWidth) + '─┴─' + '─'.repeat(ttfbWidth) + '─┴─' + '─'.repeat(dnsWidth) + '─┴─' + '─'.repeat(tlsWidth) + '─┘';

		// Results table
		lines.push(topBorder);
		lines.push(`│ ${padRight('Location', maxLocationWidth)} │ ${padRight('Status', statusWidth)} │ ${padRight('Total', totalWidth)} │ ${padRight('TTFB', ttfbWidth)} │ ${padRight('DNS', dnsWidth)} │ ${padRight('TLS', tlsWidth)} │`);
		lines.push(middleBorder);

		sortedResults.forEach(result => {
			const location = formatLocation(result.probe);

			if (result.result.status === 'finished') {
				const httpResult = result.result as FinishedHttpTestResult;
				const statusText = `${httpResult.statusCode || '?'}`;
				// Defensive: check if timings exist
				const total = httpResult.timings?.total !== undefined ? `${httpResult.timings.total}ms` : '---';
				const ttfb = httpResult.timings?.firstByte !== undefined ? `${httpResult.timings.firstByte}ms` : '---';
				const dns = httpResult.timings?.dns !== undefined ? `${httpResult.timings.dns}ms` : '---';
				const tls = httpResult.timings?.tls !== undefined ? `${httpResult.timings.tls}ms` : '0ms';

				lines.push(`│ ${padRight(location, maxLocationWidth)} │ ${padRight(statusText, statusWidth)} │ ${padRight(total, totalWidth)} │ ${padRight(ttfb, ttfbWidth)} │ ${padRight(dns, dnsWidth)} │ ${padRight(tls, tlsWidth)} │`);
			} else {
				const statusText = (result.result as any).statusCode ? String((result.result as any).statusCode) : 'Failed';
				lines.push(`│ ${padRight(location, maxLocationWidth)} │ ${padRight(statusText, statusWidth)} │ ${padRight('---', totalWidth)} │ ${padRight('---', ttfbWidth)} │ ${padRight('---', dnsWidth)} │ ${padRight('---', tlsWidth)} │`);
			}
		});

		lines.push(bottomBorder);
		lines.push('');

		// Metadata section - compact 2-line format
		const successCount = measurement.results.filter(r => r.result.status === 'finished').length;
		const failCount = measurement.results.length - successCount;
		const status = failCount === 0 ? '✅' : failCount < measurement.results.length ? '⚠️' : '❌';

		lines.push(`📋 Target: ${measurement.target} | Probes: ${measurement.results.length} | Status: ${status} ${successCount} succeeded, ${failCount} failed | Executed: ${new Date(measurement.createdAt).toUTCString()}`);

		// Statistics (if available)
		if (successCount > 0) {
			const avgTimes = measurement.results
				.filter(r => r.result.status === 'finished')
				.map(r => (r.result as FinishedHttpTestResult).timings?.total)
				.filter((time): time is number => time !== undefined && time !== null);

			if (avgTimes.length > 0) {
				const globalAvg = avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length;
				lines.push(`📊 Success Rate: ${((successCount / measurement.results.length) * 100).toFixed(1)}% (${successCount}/${measurement.results.length}) | Global Avg Response Time: ${globalAvg.toFixed(1)}ms`);
			}
		}

		lines.push('');

		// Response headers from first successful probe
		const firstSuccess = measurement.results.find(r => r.result.status === 'finished');
		if (firstSuccess && firstSuccess.result.status === 'finished') {
			const httpResult = firstSuccess.result as FinishedHttpTestResult;
			lines.push(`📋 RESPONSE HEADERS (from ${formatLocation(firstSuccess.probe)})`);
			// Defensive: check if headers exist before calling Object.entries
			if (httpResult.headers && typeof httpResult.headers === 'object') {
				Object.entries(httpResult.headers).slice(0, 10).forEach(([key, value]) => {
					lines.push(`  ${key}: ${value}`);
				});
			} else {
				lines.push('  (No headers available)');
			}
		}

		return lines.join('\n');
	}
}

