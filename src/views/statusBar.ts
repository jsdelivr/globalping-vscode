/**
 * Status Bar Manager
 * 
 * Manages the status bar indicator showing last test status.
 */

import * as vscode from 'vscode';
import { MeasurementResponse as Measurement, FinishedPingTestResult, FinishedDnsTestResult, FinishedHttpTestResult, FinishedTracerouteTestResult, FinishedMtrTestResult } from 'globalping';
import { COMMANDS } from '../constants';

export class StatusBarManager {
	private statusBarItem: vscode.StatusBarItem;
	private lastMeasurement: Measurement | null = null;

	constructor() {
		this.statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left,
			100
		);
		this.statusBarItem.command = COMMANDS.OPEN_LAST_RESULT;
		this.updateIdle();
		this.statusBarItem.show();
	}

	/**
	 * Update status bar for idle state
	 */
	public updateIdle(): void {
		this.statusBarItem.text = '$(globe) Globalping';
		this.statusBarItem.tooltip = 'Click to run a new test';
		this.statusBarItem.command = COMMANDS.RUN_NEW_TEST;
		this.statusBarItem.backgroundColor = undefined;
	}

	/**
	 * Update status bar for running state
	 */
	public updateRunning(target: string): void {
		this.statusBarItem.text = '$(sync~spin) Globalping: Testing...';
		this.statusBarItem.tooltip = `Testing ${target}`;
		this.statusBarItem.command = undefined;
		this.statusBarItem.backgroundColor = undefined;
	}

	/**
	 * Update status bar for completed test
	 */
	public updateCompleted(measurement: Measurement): void {
		this.lastMeasurement = measurement;

		const successCount = measurement.results.filter(r => r.result.status === 'finished').length;
		const totalCount = measurement.results.length;
		const failCount = totalCount - successCount;

		// Generate test-specific status text
		const statusText = this.generateStatusText(measurement, successCount, failCount);
		const tooltip = this.generateTooltip(measurement, successCount, totalCount);

		this.statusBarItem.text = statusText;
		this.statusBarItem.tooltip = tooltip;

		// Set background color based on status
		if (failCount === 0) {
			this.statusBarItem.backgroundColor = undefined;
		} else if (successCount > 0) {
			this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
		} else {
			this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
		}

		this.statusBarItem.command = COMMANDS.SHOW_OUTPUT_CHANNEL;
	}

	/**
	 * Generate test-specific status text
	 */
	private generateStatusText(measurement: Measurement, successCount: number, failCount: number): string {
		const icon = failCount === 0 ? '$(check)' : successCount > 0 ? '$(warning)' : '$(error)';
		const type = measurement.type.toUpperCase();

		switch (measurement.type) {
			case 'ping':
				return this.generatePingStatus(measurement, successCount, failCount, icon);
			case 'dns':
				return this.generateDnsStatus(measurement, successCount, failCount, icon);
			case 'http':
				return this.generateHttpStatus(measurement, successCount, failCount, icon);
			case 'traceroute':
			case 'mtr':
				return this.generateTracerouteStatus(measurement, successCount, failCount, icon);
			default:
				return `${icon} ${type}: ${successCount}/${measurement.results.length} OK`;
		}
	}

	private generatePingStatus(measurement: Measurement, successCount: number, failCount: number, icon: string): string {
		if (successCount === 0) {
			return `${icon} Ping: All failed`;
		}

		// Add defensive checks for results array
		if (!measurement.results || !Array.isArray(measurement.results) || measurement.results.length === 0) {
			return `${icon} Ping: ${successCount}/${measurement.results?.length || 0} OK`;
		}

		const results = measurement.results.filter(r => r.result.status === 'finished');

		const avgLatencies = results
			.map(r => (r.result as FinishedPingTestResult).stats?.avg)
			.filter((avg): avg is number => avg !== null && avg !== undefined);

		if (avgLatencies.length === 0) {
			return `${icon} Ping: ${successCount}/${measurement.results.length} OK`;
		}

		const globalAvg = avgLatencies.reduce((a, b) => a + b, 0) / avgLatencies.length;
		
		// Calculate average packet loss
		const lossValues = results
			.map(r => (r.result as FinishedPingTestResult).stats?.loss)
			.filter((loss): loss is number => loss !== null && loss !== undefined);
		
		const avgLoss = lossValues.length > 0 
			? lossValues.reduce((a, b) => a + b, 0) / lossValues.length 
			: 0;

		if (failCount > 0) {
			return `${icon} Ping: ${successCount}/${measurement.results.length} OK, ${globalAvg.toFixed(1)}ms avg`;
		}

		return `${icon} Ping: ${globalAvg.toFixed(1)}ms avg, ${avgLoss.toFixed(0)}% loss`;
	}

	private generateDnsStatus(measurement: Measurement, successCount: number, failCount: number, icon: string): string {
		if (successCount === 0) {
			return `${icon} DNS: All failed`;
		}

		// Get first successful result to show query type and answer
		const successResult = measurement.results.find(r => r.result.status === 'finished');

		if (!successResult || successResult.result.status !== 'finished') {
			return `${icon} DNS: ${successCount}/${measurement.results.length} OK`;
		}

		const result = successResult.result as FinishedDnsTestResult;
		
		if ('answers' in result) {
			// Add defensive checks for nested properties
			if (!result || !result.answers || !Array.isArray(result.answers) || result.answers.length === 0) {
				return `${icon} DNS: ${successCount}/${measurement.results.length} OK`;
			}
			
			const queryType = result.answers[0]?.type || 'A';
			const firstAnswer = result.answers[0]?.value || '';

			if (failCount > 0) {
				return `${icon} DNS ${queryType}: ${successCount}/${measurement.results.length} OK`;
			}

			if (firstAnswer) {
				// Truncate long answers
				const displayAnswer = firstAnswer.length > 20 ? firstAnswer.substring(0, 20) + '...' : firstAnswer;
				return `${icon} DNS ${queryType}: ${displayAnswer}`;
			}

			return `${icon} DNS ${queryType}: ${successCount} records`;
		}
		
		return `${icon} DNS: ${successCount}/${measurement.results.length} OK`;
	}

	private generateHttpStatus(measurement: Measurement, successCount: number, failCount: number, icon: string): string {
		if (successCount === 0) {
			return `${icon} HTTP: All failed`;
		}

		// Get first successful result
		const successResult = measurement.results.find(r => r.result.status === 'finished');

		if (!successResult || successResult.result.status !== 'finished') {
			return `${icon} HTTP: ${successCount}/${measurement.results.length} OK`;
		}

		const result = successResult.result as FinishedHttpTestResult;
		
		// Add defensive checks
		if (!result) {
			return `${icon} HTTP: ${successCount}/${measurement.results.length} OK`;
		}
		
		const statusCode = result.statusCode || 200;
		const totalTime = result.timings?.total || 0;

		if (failCount > 0) {
			return `${icon} HTTP: ${successCount}/${measurement.results.length} OK`;
		}

		return `${icon} HTTP ${statusCode}: ${totalTime.toFixed(0)}ms`;
	}

	private generateTracerouteStatus(measurement: Measurement, successCount: number, failCount: number, icon: string): string {
		const testType = measurement.type === 'mtr' ? 'MTR' : 'Trace';
		
		if (successCount === 0) {
			return `${icon} ${testType}: All failed`;
		}

		// Get first successful result
		const successResult = measurement.results.find(r => r.result.status === 'finished');

		if (!successResult || successResult.result.status !== 'finished') {
			return `${icon} ${testType}: ${successCount}/${measurement.results.length} OK`;
		}

		const result = successResult.result as FinishedTracerouteTestResult | FinishedMtrTestResult;
		
		// Add defensive checks
		if (!result) {
			return `${icon} ${testType}: ${successCount}/${measurement.results.length} OK`;
		}
		
		const hopCount = result.hops?.length || 0;

		// Calculate average latency for MTR
		if (measurement.type === 'mtr' && result.hops && Array.isArray(result.hops) && result.hops.length > 0) {
			const avgLatencies = (result as FinishedMtrTestResult).hops
				.map((hop) => hop?.stats?.avg)
				.filter((avg) => avg !== null && avg !== undefined) as number[];
			
			if (avgLatencies.length > 0) {
				const lastHopAvg = avgLatencies[avgLatencies.length - 1];
				if (failCount > 0) {
					return `${icon} ${testType}: ${successCount}/${measurement.results.length} OK, ${hopCount} hops`;
				}
				return `${icon} ${testType}: ${hopCount} hops, ${lastHopAvg.toFixed(0)}ms`;
			}
		}

		if (failCount > 0) {
			return `${icon} ${testType}: ${successCount}/${measurement.results.length} OK`;
		}

		return `${icon} ${testType}: ${hopCount} hops`;
	}

	/**
	 * Generate detailed tooltip
	 */
	private generateTooltip(measurement: Measurement, successCount: number, totalCount: number): string {
		const lines: string[] = [];
		lines.push(`${measurement.type.toUpperCase()} Test: ${measurement.target}`);
		lines.push(`Status: ${successCount}/${totalCount} probes succeeded`);
		lines.push(`Test ID: ${measurement.id}`);
		lines.push('Click to view detailed results');
		return lines.join('\n');
	}

	/**
	 * Get last measurement
	 */
	public getLastMeasurement(): Measurement | null {
		return this.lastMeasurement;
	}

	/**
	 * Dispose
	 */
	public dispose(): void {
		this.statusBarItem.dispose();
	}
}

