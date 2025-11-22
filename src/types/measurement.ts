/**
 * Internal measurement types used by the extension
 * 
 * These types extend the base Globalping types with extension-specific
 * functionality like history tracking and saved targets.
 */

import {
	MeasurementType,
	PingMeasurementRequest,
	TracerouteMeasurementRequest,
	MtrMeasurementRequest,
	DnsMeasurementRequest,
	HttpMeasurementRequest,
	MeasurementResponse as Measurement
} from 'globalping';

/**
 * Extended configuration for tests, including optional name for saved targets
 */
export type TestConfig = (PingMeasurementRequest & { name?: string }) |
	(TracerouteMeasurementRequest & { name?: string }) |
	(MtrMeasurementRequest & { name?: string }) |
	(DnsMeasurementRequest & { name?: string }) |
	(HttpMeasurementRequest & { name?: string });

/**
 * Entry in the test history
 */
export interface TestHistoryEntry {
	id: string;
	timestamp: string;
	config: TestConfig;
	result: Measurement;
	status: 'success' | 'partial' | 'failed';
}

/**
 * Saved test configuration for quick re-running
 */
export interface SavedTest {
	id: string;
	name: string;
	config: TestConfig;
	createdAt: string;
}

/**
 * Result of parsing user input to extract target information
 */
export interface ParseResult {
	isValid: boolean;
	target: string;
	isLocalhost: boolean;
	isPrivateIp: boolean;
	suggestedTestType: MeasurementType;
	confidence: 'high' | 'medium' | 'low';
	rawInput: string;
}

