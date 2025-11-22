/**
 * Measurement Builder Service
 *
 * Centralized logic for building measurement configurations.
 * Handles target parsing and measurement options for all test types.
 */

import { MeasurementType } from 'globalping';
import { HttpTargetParser } from '../parsers/httpTargetParser';
import { TargetParser } from '../parsers/targetParser';

export interface MeasurementConfig {
	target: string;
	measurementOptions: any;
}

export interface BuildOptions {
	userOverrides?: any;  // User-specified overrides for measurement options
}

/**
 * Builds the final target and measurement options for a test
 */
export class MeasurementBuilder {
	private httpParser = new HttpTargetParser();
	private targetParser = new TargetParser();

	/**
	 * Build measurement configuration from raw user input
	 *
	 * @param rawTarget - The raw target input from the user (URL, domain, or IP)
	 * @param testType - The type of test (ping, http, dns, etc.)
	 * @param defaultHttpProtocol - Default protocol for HTTP tests (from settings)
	 * @param options - Optional user overrides
	 * @returns Parsed target and measurement options
	 */
	public buildConfig(
		rawTarget: string,
		testType: MeasurementType,
		defaultHttpProtocol: 'HTTP' | 'HTTPS' = 'HTTPS',
		options?: BuildOptions
	): MeasurementConfig {
		if (testType === 'http') {
			return this.buildHttpConfig(rawTarget, defaultHttpProtocol, options);
		} else {
			return this.buildNonHttpConfig(rawTarget, options);
		}
	}

	/**
	 * Build HTTP measurement configuration
	 */
	private buildHttpConfig(
		rawTarget: string,
		defaultHttpProtocol: 'HTTP' | 'HTTPS',
		options?: BuildOptions
	): MeasurementConfig {
		const parsed = this.httpParser.parse(rawTarget, defaultHttpProtocol);

		if (!parsed.isValid) {
			throw new Error(parsed.errorMessage || 'Invalid HTTP target');
		}

		// Build measurement options with parsed values
		const measurementOptions: any = {
			request: {
				method: options?.userOverrides?.method || 'GET',
				path: parsed.path,
				query: parsed.query,
			},
			protocol: options?.userOverrides?.protocol || parsed.protocol,
			port: options?.userOverrides?.port || parsed.port,
		};

		// Merge any additional user overrides
		if (options?.userOverrides) {
			const { method: _method, protocol: _protocol, port: _port, ...otherOverrides } = options.userOverrides;
			Object.assign(measurementOptions, otherOverrides);
		}

		return {
			target: parsed.target,  // Hostname only
			measurementOptions
		};
	}

	/**
	 * Build configuration for non-HTTP tests (ping, dns, traceroute, mtr)
	 * Extracts hostname from URLs if provided
	 */
	private buildNonHttpConfig(
		rawTarget: string,
		options?: BuildOptions
	): MeasurementConfig {
		// Extract hostname from URLs (e.g., https://google.com/path -> google.com)
		const target = this.targetParser.extractHostname(rawTarget);

		return {
			target,
			measurementOptions: options?.userOverrides || {}
		};
	}

	/**
	 * Validate if a target is acceptable (not localhost, not private IP)
	 * Used for early validation before parsing
	 */
	public validateTarget(rawTarget: string): { isValid: boolean; errorMessage?: string } {
		const parseResult = this.targetParser.parse(rawTarget);

		if (!parseResult.isValid) {
			return {
				isValid: false,
				errorMessage: `Cannot parse "${rawTarget}" as a valid target. Expected: domain, IP, or URL.`
			};
		}

		if (parseResult.isLocalhost) {
			return {
				isValid: false,
				errorMessage: 'Cannot test localhost from external probes. Use a tunnel service like ngrok.'
			};
		}

		if (parseResult.isPrivateIp) {
			return {
				isValid: false,
				errorMessage: 'Cannot test private IP addresses from external probes.'
			};
		}

		return { isValid: true };
	}
}
