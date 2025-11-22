/**
 * DNS Formatter
 *
 * Formats DNS test results into a readable format.
 */

import { MeasurementResponse as Measurement, FinishedDnsTestResult } from 'globalping';
import { IFormatter } from './formatterFactory';
import { formatLocation } from './formatterUtils';

export class DnsFormatter implements IFormatter {
	public format(measurement: Measurement): string {
		const lines: string[] = [];

		// Simple header
		lines.push(`DNS ${measurement.target}`);
		lines.push('');

		// Results
		measurement.results.forEach((result, index) => {
			const probe = result.probe;
			const location = formatLocation(probe);

			if (result.result.status === 'finished') {
				const dnsResult = result.result as FinishedDnsTestResult;
				if ('resolver' in dnsResult) {
					lines.push(`📍 ${location} (Resolver: ${dnsResult.resolver || 'Unknown'})`);
				} else {
					lines.push(`📍 ${location}`);
				}

				if ('timings' in dnsResult && dnsResult.timings) {
					lines.push(`   Time: ${dnsResult.timings.total || 0}ms`);
				}

				if ('answers' in dnsResult) {
					// Now TypeScript knows that dnsResult is a FinishedSimpleDnsTestResult
					if (dnsResult.answers && dnsResult.answers.length > 0) {
						lines.push('   Answers:');
						dnsResult.answers.forEach(answer => {
							lines.push(`     ${answer.type}: ${answer.value} (TTL: ${answer.ttl}s)`);
						});
					} else {
						lines.push('   ❌ No answers received');
					}
				} else if ('hops' in dnsResult) {
					// Now TypeScript knows that dnsResult is a FinishedTraceDnsTestResult
					dnsResult.hops.forEach(hop => {
						if (hop.answers && hop.answers.length > 0) {
							lines.push(`   Answers from ${hop.resolver}:`);
							hop.answers.forEach(answer => {
								lines.push(`     ${answer.type}: ${answer.value} (TTL: ${answer.ttl}s)`);
							});
						}
					});
				}
			} else {
				const location = formatLocation(probe);
				lines.push(`📍 ${location}`);
				lines.push('   ❌ No answers received');
			}
			
			if (index < measurement.results.length - 1) {
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

