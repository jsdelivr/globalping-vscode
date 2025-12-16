/**
 * Test Config Builder
 * 
 * Fluent API for creating valid TestConfig objects.
 * This centralizes the logic for building test configurations and
 * handles the transformation of user-friendly input (like string locations)
 * into the format required by the Globalping API.
 */

import { MeasurementType } from 'globalping';
import { TestConfig } from '../types/measurement';

export class TestConfigBuilder {
	private config: Partial<TestConfig> = {};

	public withType(type: MeasurementType): TestConfigBuilder {
		this.config.type = type;
		return this;
	}

	public withTarget(target: string): TestConfigBuilder {
		this.config.target = target;
		return this;
	}

	public withLocations(locations: string | string[]): TestConfigBuilder {
		// Convert to array if string
		const locationsArray = Array.isArray(locations) ? locations : [locations];

		// Split comma-separated locations and flatten
		const expandedLocations = locationsArray.flatMap(loc =>
			loc.split(',').map(l => l.trim()).filter(l => l.length > 0)
		);

		this.config.locations = expandedLocations.map(loc => ({ magic: loc }));
		return this;
	}

	public withLimit(limit: number): TestConfigBuilder {
		this.config.limit = limit;
		return this;
	}

	public withInProgressUpdates(inProgressUpdates: boolean): TestConfigBuilder {
		this.config.inProgressUpdates = inProgressUpdates;
		return this;
	}

	public withMeasurementOptions(options: any): TestConfigBuilder {
		if (options && Object.keys(options).length > 0) {
			this.config.measurementOptions = options;
		}
		return this;
	}

	public build(): TestConfig {
		if (!this.config.type || !this.config.target || !this.config.locations) {
			throw new Error('Missing required test configuration properties: type, target, and locations are required.');
		}
		return this.config as TestConfig;
	}
}
