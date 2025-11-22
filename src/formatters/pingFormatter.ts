/**
 * Ping Formatter
 *
 * Formats ping test results into a readable table format.
 */

import { MeasurementResponse as Measurement, FinishedPingTestResult } from 'globalping';
import { IFormatter } from './formatterFactory';
import { getVisualWidth, padRight, formatLocation } from './formatterUtils';

export class PingFormatter implements IFormatter {
	public format(measurement: Measurement): string {
		const lines: string[] = [];

		lines.push(`PING ${measurement.target}`);
		lines.push('');

		const successCount = measurement.results.filter(r => r.result.status === 'finished').length;
		const failCount = measurement.results.length - successCount;

		// Sort: failed first, then by latency
		const sortedResults = [...measurement.results].sort((a, b) => {
			const aStatus = a.result.status;
			const bStatus = b.result.status;
			
			if (aStatus === 'failed' && bStatus !== 'failed') {
				return -1;
			}
			if (aStatus !== 'failed' && bStatus === 'failed') {
				return 1;
			}
			if (aStatus === 'finished' && bStatus === 'finished') {
				const aStats = (a.result as FinishedPingTestResult).stats;
				const bStats = (b.result as FinishedPingTestResult).stats;
				return (aStats?.avg || 0) - (bStats?.avg || 0);
			}
			return 0;
		});

		// Calculate dynamic column widths based on visual width
		let maxLocationWidth = getVisualWidth('Location');
		sortedResults.forEach(result => {
			const location = formatLocation(result.probe);
			maxLocationWidth = Math.max(maxLocationWidth, getVisualWidth(location));
		});

		// Add some padding to location column for readability
		maxLocationWidth = Math.min(maxLocationWidth + 2, 60); // Cap at 60 chars

		// Column widths (accounting for emoji visual width)
		// '✅ OK' = 2 (emoji) + 1 (space) + 2 (OK) = 5, so width = 6 for padding
		const statusWidth = 7;  // Increased to accommodate emoji properly
		const minWidth = 7;
		const avgWidth = 7;
		const maxWidth = 7;
		const lossWidth = 6;

		// Build dynamic table border
		const topBorder = '┌─' + '─'.repeat(maxLocationWidth) + '─┬─' + '─'.repeat(statusWidth) + '─┬─' + '─'.repeat(minWidth) + '─┬─' + '─'.repeat(avgWidth) + '─┬─' + '─'.repeat(maxWidth) + '─┬─' + '─'.repeat(lossWidth) + '─┐';
		const middleBorder = '├─' + '─'.repeat(maxLocationWidth) + '─┼─' + '─'.repeat(statusWidth) + '─┼─' + '─'.repeat(minWidth) + '─┼─' + '─'.repeat(avgWidth) + '─┼─' + '─'.repeat(maxWidth) + '─┼─' + '─'.repeat(lossWidth) + '─┤';
		const bottomBorder = '└─' + '─'.repeat(maxLocationWidth) + '─┴─' + '─'.repeat(statusWidth) + '─┴─' + '─'.repeat(minWidth) + '─┴─' + '─'.repeat(avgWidth) + '─┴─' + '─'.repeat(maxWidth) + '─┴─' + '─'.repeat(lossWidth) + '─┘';

		// Results table
		lines.push(topBorder);
		lines.push(`│ ${padRight('Location', maxLocationWidth)} │ ${padRight('Status', statusWidth)} │ ${padRight('Min', minWidth)} │ ${padRight('Avg', avgWidth)} │ ${padRight('Max', maxWidth)} │ ${padRight('Loss', lossWidth)} │`);
		lines.push(middleBorder);

		sortedResults.forEach(result => {
			const location = formatLocation(result.probe);

			const statusIcon = result.result.status === 'finished' ? '✅ OK' : '❌ FAIL';

			if (result.result.status === 'finished') {
				const pingResult = result.result as FinishedPingTestResult;
				const stats = pingResult.stats;
				// Defensive: check if stats exist before accessing properties
				const min = stats?.min !== undefined && stats?.min !== null ? `${stats.min.toFixed(1)}ms` : '---';
				const avg = stats?.avg !== undefined && stats?.avg !== null ? `${stats.avg.toFixed(1)}ms` : '---';
				const max = stats?.max !== undefined && stats?.max !== null ? `${stats.max.toFixed(1)}ms` : '---';
				const loss = stats?.loss !== undefined && stats?.loss !== null ? `${stats.loss}%` : '---';

				lines.push(`│ ${padRight(location, maxLocationWidth)} │ ${padRight(statusIcon, statusWidth)} │ ${padRight(min, minWidth)} │ ${padRight(avg, avgWidth)} │ ${padRight(max, maxWidth)} │ ${padRight(loss, lossWidth)} │`);
			} else {
				lines.push(`│ ${padRight(location, maxLocationWidth)} │ ${padRight(statusIcon, statusWidth)} │ ${padRight('---', minWidth)} │ ${padRight('---', avgWidth)} │ ${padRight('---', maxWidth)} │ ${padRight('---', lossWidth)} │`);
			}
		});

		lines.push(bottomBorder);
		lines.push('');

		// Metadata section - compressed into 2 lines
		const status = failCount === 0 ? '✅' : failCount < measurement.results.length ? '⚠️' : '❌';
		lines.push(`📋 Target: ${measurement.target} | Probes: ${measurement.results.length} | Status: ${status} ${successCount} succeeded, ${failCount} failed | Executed: ${new Date(measurement.createdAt).toUTCString()}`);

		// Statistics
		if (successCount > 0) {
			const avgLatencies = measurement.results
				.filter(r => r.result.status === 'finished')
				.map(r => (r.result as FinishedPingTestResult).stats?.avg)
				.filter(avg => avg !== undefined && avg !== null) as number[];
			
			if (avgLatencies.length > 0) {
				const globalAvg = avgLatencies.reduce((a, b) => a + b, 0) / avgLatencies.length;
				lines.push(`📊 Success Rate: ${((successCount / measurement.results.length) * 100).toFixed(1)}% (${successCount}/${measurement.results.length}) | Global Avg Latency: ${globalAvg.toFixed(1)}ms`);
			}
		}

		return lines.join('\n');
	}
}

