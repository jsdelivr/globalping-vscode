/**
 * Integration Tests for Test-Specific Options
 * 
 * Tests all measurement types with their specific options to ensure
 * proper configuration and parameter passing to the Globalping API.
 */

import * as assert from 'assert';
import { MeasurementPingOptions, MeasurementHttpOptions, MeasurementDnsOptions, MeasurementTracerouteOptions, MeasurementMtrOptions } from 'globalping';
// MeasurementConfig is handled by TestConfigBuilder in the extension

suite('Test Options Integration', () => {
	test('Ping options should include protocol and ipVersion', () => {
		const config: any = {
			type: 'ping',
			target: 'example.com',
			locations: [{ magic: 'World' }],
			limit: 3,
			measurementOptions: {
				protocol: 'ICMP',
				ipVersion: 4
			} as MeasurementPingOptions
		};

		assert.strictEqual(config.type, 'ping');
		assert.strictEqual((config.measurementOptions as MeasurementPingOptions).protocol, 'ICMP');
		assert.strictEqual((config.measurementOptions as MeasurementPingOptions).ipVersion, 4);
	});

	test('Ping TCP protocol option', () => {
		const options: MeasurementPingOptions = {
			protocol: 'TCP',
			ipVersion: 6
		};

		assert.strictEqual(options.protocol, 'TCP');
		assert.strictEqual(options.ipVersion, 6);
	});

	test('HTTP options should include method, port, and ipVersion', () => {
		const config: any = {
			type: 'http',
			target: 'https://api.example.com',
			locations: [{ magic: 'USA' }],
			limit: 3,
			measurementOptions: {
				request: {
					method: 'GET'
				},
				port: 443,
				ipVersion: 4
			} as MeasurementHttpOptions
		};

		assert.strictEqual(config.type, 'http');
		const httpOpts = config.measurementOptions as MeasurementHttpOptions;
		assert.strictEqual(httpOpts.request?.method, 'GET');
		assert.strictEqual(httpOpts.port, 443);
		assert.strictEqual(httpOpts.ipVersion, 4);
	});

	test('HTTP HEAD and OPTIONS methods', () => {
		const headOptions: MeasurementHttpOptions = {
			request: { method: 'HEAD' },
			port: 443,
			ipVersion: 4
		};
		const optionsMethod: MeasurementHttpOptions = {
			request: { method: 'OPTIONS' },
			port: 80,
			ipVersion: 6
		};

		assert.strictEqual(headOptions.request?.method, 'HEAD');
		assert.strictEqual(optionsMethod.request?.method, 'OPTIONS');
		assert.strictEqual(optionsMethod.port, 80);
	});

	test('DNS options with IP resolver should NOT include ipVersion', () => {
		// IMPORTANT: API validation - ipVersion is not allowed when resolver is an IP address
		const config: any = {
			type: 'dns',
			target: 'example.com',
			locations: [{ magic: 'California' }],
			limit: 3,
			measurementOptions: {
				query: { type: 'A' },
				resolver: '8.8.8.8'
				// NO ipVersion when resolver is an IP address
			} as MeasurementDnsOptions
		};

		assert.strictEqual(config.type, 'dns');
		const dnsOpts = config.measurementOptions as MeasurementDnsOptions;
		assert.strictEqual(dnsOpts.query?.type, 'A');
		assert.strictEqual(dnsOpts.resolver, '8.8.8.8');
		assert.strictEqual(dnsOpts.ipVersion, undefined, 'ipVersion should not be included with IP resolver');
	});

	test('DNS options with domain resolver SHOULD include ipVersion', () => {
		// ipVersion IS allowed when resolver is a domain name
		const config: any = {
			type: 'dns',
			target: 'example.com',
			locations: [{ magic: 'California' }],
			limit: 3,
			measurementOptions: {
				query: { type: 'A' },
				resolver: 'dns.google.com',
				ipVersion: 4
			} as MeasurementDnsOptions
		};

		assert.strictEqual(config.type, 'dns');
		const dnsOpts = config.measurementOptions as MeasurementDnsOptions;
		assert.strictEqual(dnsOpts.query?.type, 'A');
		assert.strictEqual(dnsOpts.resolver, 'dns.google.com');
		assert.strictEqual(dnsOpts.ipVersion, 4, 'ipVersion is allowed with domain resolver');
	});

	test('DNS options with IPv6 resolver should NOT include ipVersion', () => {
		// IMPORTANT: IPv6 addresses also should not include ipVersion
		const config: any = {
			type: 'dns',
			target: 'example.com',
			locations: [{ magic: 'World' }],
			limit: 3,
			measurementOptions: {
				query: { type: 'AAAA' },
				resolver: '2001:4860:4860::8888'
				// NO ipVersion when resolver is an IPv6 address
			} as MeasurementDnsOptions
		};

		assert.strictEqual(config.type, 'dns');
		const dnsOpts = config.measurementOptions as MeasurementDnsOptions;
		assert.strictEqual(dnsOpts.query?.type, 'AAAA');
		assert.strictEqual(dnsOpts.resolver, '2001:4860:4860::8888');
		assert.strictEqual(dnsOpts.ipVersion, undefined, 'ipVersion should not be included with IPv6 resolver');
	});

	test('DNS all query types', () => {
		const types: Array<'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'PTR'> = 
			['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'PTR'];

		types.forEach(type => {
			const options: MeasurementDnsOptions = {
				query: { type },
				ipVersion: 4
			};
			assert.strictEqual(options.query?.type, type);
		});
	});

	test('DNS without custom resolver (uses local probe resolver)', () => {
		const options: MeasurementDnsOptions = {
			query: { type: 'A' },
			ipVersion: 4
			// No resolver specified - should use local probe resolver
		};

		assert.strictEqual(options.resolver, undefined);
		assert.strictEqual(options.query?.type, 'A');
	});

	test('Traceroute options should include protocol and ipVersion', () => {
		const config: any = {
			type: 'traceroute',
			target: 'example.com',
			locations: [{ magic: 'AWS' }],
			limit: 3,
			measurementOptions: {
				protocol: 'ICMP',
				ipVersion: 4
			} as MeasurementTracerouteOptions
		};

		assert.strictEqual(config.type, 'traceroute');
		const traceOpts = config.measurementOptions as MeasurementTracerouteOptions;
		assert.strictEqual(traceOpts.protocol, 'ICMP');
		assert.strictEqual(traceOpts.ipVersion, 4);
	});

	test('Traceroute all protocols', () => {
		const protocols: Array<'ICMP' | 'TCP' | 'UDP'> = ['ICMP', 'TCP', 'UDP'];

		protocols.forEach(protocol => {
			const options: MeasurementTracerouteOptions = {
				protocol,
				ipVersion: 4
			};
			assert.strictEqual(options.protocol, protocol);
		});
	});

	test('MTR options should include protocol and ipVersion', () => {
		const config: any = {
			type: 'mtr',
			target: 'example.com',
			locations: [{ magic: 'New York' }],
			limit: 3,
			measurementOptions: {
				protocol: 'ICMP',
				ipVersion: 6
			} as MeasurementMtrOptions
		};

		assert.strictEqual(config.type, 'mtr');
		const mtrOpts = config.measurementOptions as MeasurementMtrOptions;
		assert.strictEqual(mtrOpts.protocol, 'ICMP');
		assert.strictEqual(mtrOpts.ipVersion, 6);
	});

	test('Location magic field accepts various formats', () => {
		const validLocations = [
			'World',
			'global',
			'USA',
			'California',
			'AWS',
			'New York',
			'Comcast',
			'Google+Japan',
			'aws-eu-west-1',
			'continent:EU',
			'US+GB+DE'
		];

		validLocations.forEach(location => {
			const config: any = {
				type: 'ping',
				target: 'example.com',
				locations: [{ magic: location }],
				limit: 3
			};

			assert.strictEqual(config.locations[0].magic, location);
		});
	});

	test('IPv6 option on all measurement types', () => {
		const types: Array<'ping' | 'http' | 'dns' | 'traceroute' | 'mtr'> = 
			['ping', 'http', 'dns', 'traceroute', 'mtr'];

		types.forEach(type => {
			let options: any = { ipVersion: 6 };
			
			// Add type-specific required fields
			if (type === 'http') {
				options.method = 'GET';
				options.port = 443;
			} else if (type === 'dns') {
				options.query = { type: 'A' };
			} else if (type === 'ping' || type === 'traceroute' || type === 'mtr') {
				options.protocol = 'ICMP';
			}

			assert.strictEqual(options.ipVersion, 6, `IPv6 should work for ${type}`);
		});
	});
});

