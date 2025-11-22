/**
 * Config Validator
 * 
 * Validates measurement configuration before sending to API.
 * Ensures all required fields are present and within valid ranges.
 */

import {
	TypedMeasurementRequest as MeasurementRequest,
	MeasurementType,
	MeasurementLocationOption
} from 'globalping';
import { ValidationError } from '../services/errors';

// MeasurementLocations type from the library (can be string or array)
type MeasurementLocations = Array<MeasurementLocationOption> | string;

export class ConfigValidator {
	private static readonly MIN_LIMIT = 1;
	private static readonly MAX_LIMIT = 100;
	private static readonly MAX_TARGET_LENGTH = 256;

	/**
	 * Validate measurement configuration
	 */
	public validate(config: MeasurementRequest): void {
		this.validateType(config.type);
		this.validateTarget(config.target);
		this.validateLocations(config.locations);
		if (config.limit !== undefined) {
			this.validateLimit(config.limit);
		}
	}

	/**
	 * Validate measurement type
	 */
	private validateType(type: MeasurementType): void {
		const validTypes: MeasurementType[] = ['ping', 'http', 'dns', 'traceroute', 'mtr'];
		
		if (!validTypes.includes(type)) {
			throw new ValidationError(`Invalid measurement type: ${type}`, 'type');
		}
	}

	/**
	 * Validate target
	 */
	private validateTarget(target: string): void {
		if (!target || target.trim().length === 0) {
			throw new ValidationError('Target is required', 'target');
		}

		if (target.length > ConfigValidator.MAX_TARGET_LENGTH) {
			throw new ValidationError(
				`Target is too long (max ${ConfigValidator.MAX_TARGET_LENGTH} characters)`,
				'target'
			);
		}

		// Check for dangerous protocols
		if (target.match(/^(javascript|data|file):/i)) {
			throw new ValidationError('Invalid target protocol', 'target');
		}
	}

	/**
	 * Validate locations
	 */
	private validateLocations(locations: MeasurementLocations | undefined): void {
		if (!locations) {
			throw new ValidationError('At least one location is required', 'locations');
		}

		// Handle string format (e.g., "world", "US", etc.)
		if (typeof locations === 'string') {
			if (locations.trim().length === 0) {
				throw new ValidationError('Location string cannot be empty', 'locations');
			}
			return;
		}

		// Must be an array at this point
		if (!Array.isArray(locations)) {
			throw new ValidationError('Locations must be a string or an array', 'locations');
		}

		// Handle array format
		if (locations.length === 0) {
			throw new ValidationError('At least one location is required', 'locations');
		}

		if (locations.length > 10) {
			throw new ValidationError('Too many locations (max 10)', 'locations');
		}

		// Validate each location object
		for (const location of locations) {
			// Check if this is a string (common mistake - should use { magic: 'string' })
			if (typeof location === 'string') {
				throw new ValidationError(
					'Location array items must be objects with properties like { magic: "world" }, not strings. ' +
					'If you want to use a single location string, pass it directly without an array.',
					'locations'
				);
			}

			// Check if this is actually an object
			if (typeof location !== 'object' || location === null) {
				throw new ValidationError('Each location must be an object', 'locations');
			}

			// Check if at least one location property is set
			const hasValidProperty =
				location.magic ||
				location.continent ||
				location.country ||
				location.city ||
				location.region ||
				location.state ||
				location.asn ||
				location.network ||
				location.tags;

			if (!hasValidProperty) {
				throw new ValidationError('Location must have at least one property set', 'locations');
			}

			// If magic is set, ensure it's not empty and a string
			if (location.magic !== undefined) {
				if (typeof location.magic !== 'string') {
					throw new ValidationError('Location magic must be a string', 'locations');
				}
				if (location.magic.trim().length === 0) {
					throw new ValidationError('Location magic string cannot be empty', 'locations');
				}
			}
		}
	}

	/**
	 * Validate probe limit
	 */
	private validateLimit(limit: number): void {
		if (limit < ConfigValidator.MIN_LIMIT || limit > ConfigValidator.MAX_LIMIT) {
			throw new ValidationError(
				`Limit must be between ${ConfigValidator.MIN_LIMIT} and ${ConfigValidator.MAX_LIMIT}`,
				'limit'
			);
		}
	}
}

