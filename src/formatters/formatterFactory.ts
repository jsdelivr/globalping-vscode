/**
 * Formatter Factory
 * 
 * Factory pattern for selecting the appropriate formatter based on measurement type.
 */

import { MeasurementType, MeasurementResponse as Measurement } from 'globalping';
import { PingFormatter } from './pingFormatter';
import { HttpFormatter } from './httpFormatter';
import { DnsFormatter } from './dnsFormatter';
import { TracerouteFormatter } from './tracerouteFormatter';
import { RawPingFormatter } from './rawPingFormatter';
import { RawHttpFormatter } from './rawHttpFormatter';
import { RawDnsFormatter } from './rawDnsFormatter';
import { RawTracerouteFormatter } from './rawTracerouteFormatter';

export interface IFormatter {
	format(measurement: Measurement): string;
}

export class FormatterFactory {
	private formatters: Map<MeasurementType, IFormatter>;
	private rawFormatters: Map<MeasurementType, IFormatter>;

	constructor() {
		// Standard formatters
		this.formatters = new Map();
		this.formatters.set('ping', new PingFormatter());
		this.formatters.set('http', new HttpFormatter());
		this.formatters.set('dns', new DnsFormatter());
		this.formatters.set('traceroute', new TracerouteFormatter());
		this.formatters.set('mtr', new TracerouteFormatter()); // MTR uses same format as traceroute

		// Raw CLI-style formatters
		this.rawFormatters = new Map();
		this.rawFormatters.set('ping', new RawPingFormatter());
		this.rawFormatters.set('http', new RawHttpFormatter());
		this.rawFormatters.set('dns', new RawDnsFormatter());
		this.rawFormatters.set('traceroute', new RawTracerouteFormatter());
		this.rawFormatters.set('mtr', new RawTracerouteFormatter()); // MTR uses same format as traceroute
	}

	public getFormatter(type: MeasurementType, raw: boolean = false): IFormatter {
		const formatters = raw ? this.rawFormatters : this.formatters;
		const formatter = formatters.get(type);
		
		if (!formatter) {
			throw new Error(`No formatter found for measurement type: ${type}`);
		}

		return formatter;
	}

	public format(measurement: Measurement, raw: boolean = false): string {
		const formatter = this.getFormatter(measurement.type, raw);
		return formatter.format(measurement);
	}
}

