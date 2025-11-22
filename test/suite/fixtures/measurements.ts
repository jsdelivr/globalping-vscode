/**
 * Measurement Fixtures
 *
 * Predefined measurement data for testing various scenarios.
 */

import { MeasurementResponse as Measurement } from 'globalping';

// Helper to create a probe structure for measurement results (flattened, no version field)
const createProbe = (partial: any): any => ({
	continent: partial.continent || 'EU',
	region: partial.region || 'Western Europe',
	country: partial.country || 'DE',
	state: partial.state || null,
	city: partial.city || '',
	asn: partial.asn || 0,
	network: partial.network || '',
	latitude: partial.latitude || 0,
	longitude: partial.longitude || 0,
	tags: partial.tags || ['datacenter-network'],
	resolvers: partial.resolvers || ['8.8.8.8']
});

/**
 * Successful ping measurement with complete data
 */
export const successfulPingMeasurement: Measurement = {
	id: 'ping-success-001',
	type: 'ping' as const,
	target: 'example.com',
	status: 'finished' as const,
	createdAt: '2024-01-01T12:00:00Z',
	updatedAt: '2024-01-01T12:00:10Z',
	probesCount: 3,
	results: [
		{
			probe: createProbe({
				continent: 'EU',
				region: 'Western Europe',
				country: 'DE',
				city: 'Falkenstein',
				asn: 24940,
				network: 'Hetzner Online',
				latitude: 50.4779,
				longitude: 12.3713
			}),
			result: {
				status: 'finished' as const,
				rawOutput: 'PING example.com (93.184.216.34): 56 data bytes\n64 bytes from 93.184.216.34: icmp_seq=0 ttl=56 time=5.1 ms\n64 bytes from 93.184.216.34: icmp_seq=1 ttl=56 time=5.3 ms\n64 bytes from 93.184.216.34: icmp_seq=2 ttl=56 time=5.6 ms\n\n--- example.com ping statistics ---\n3 packets transmitted, 3 received, 0% packet loss\nrtt min/avg/max = 5.1/5.3/5.6 ms',
				resolvedAddress: '93.184.216.34',
				resolvedHostname: null,
				stats: {
					min: 5.1,
					avg: 5.3,
					max: 5.6,
					total: 3,
					rcv: 3,
					drop: 0,
					loss: 0
				},
				timings: []
			}
		},
		{
			probe: createProbe({
				continent: 'NA',
				region: 'Northern America',
				country: 'US',
				state: 'NY',
				city: 'New York',
				asn: 16509,
				network: 'AWS',
				latitude: 40.7128,
				longitude: -74.0060
			}),
			result: {
				status: 'finished' as const,
				rawOutput: 'PING example.com (93.184.216.34): 56 data bytes\n64 bytes from 93.184.216.34: icmp_seq=0 ttl=56 time=10.2 ms\n64 bytes from 93.184.216.34: icmp_seq=1 ttl=56 time=11.5 ms\n64 bytes from 93.184.216.34: icmp_seq=2 ttl=56 time=13.1 ms\n\n--- example.com ping statistics ---\n3 packets transmitted, 3 received, 0% packet loss\nrtt min/avg/max = 10.2/11.5/13.1 ms',
				resolvedAddress: '93.184.216.34',
				resolvedHostname: null,
				stats: {
					min: 10.2,
					avg: 11.5,
					max: 13.1,
					total: 3,
					rcv: 3,
					drop: 0,
					loss: 0
				},
				timings: []
			}
		},
		{
			probe: createProbe({
				continent: 'AS',
				region: 'Eastern Asia',
				country: 'JP',
				city: 'Tokyo',
				asn: 2914,
				network: 'NTT',
				latitude: 35.6762,
				longitude: 139.6503
			}),
			result: {
				status: 'finished' as const,
				rawOutput: 'PING example.com (93.184.216.34): 56 data bytes\n64 bytes from 93.184.216.34: icmp_seq=0 ttl=56 time=150.3 ms\n64 bytes from 93.184.216.34: icmp_seq=1 ttl=56 time=151.2 ms\n64 bytes from 93.184.216.34: icmp_seq=2 ttl=56 time=152.8 ms\n\n--- example.com ping statistics ---\n3 packets transmitted, 3 received, 0% packet loss\nrtt min/avg/max = 150.3/151.2/152.8 ms',
				resolvedAddress: '93.184.216.34',
				resolvedHostname: null,
				stats: {
					min: 150.3,
					avg: 151.2,
					max: 152.8,
					total: 3,
					rcv: 3,
					drop: 0,
					loss: 0
				},
				timings: []
			}
		}
	]
};

/**
 * HTTP measurement with complete data
 */
export const successfulHttpMeasurement: Measurement = {
	id: 'http-success-001',
	type: 'http' as const,
	target: 'https://example.com',
	status: 'finished' as const,
	createdAt: '2024-01-01T12:00:00Z',
	updatedAt: '2024-01-01T12:00:05Z',
	probesCount: 1,
	results: [
		{
			probe: createProbe({
				continent: 'EU',
				region: 'Northern Europe',
				country: 'GB',
				city: 'London',
				asn: 14061,
				network: 'Digital Ocean',
				latitude: 51.5074,
				longitude: -0.1278
			}),
			result: {
				status: 'finished' as const,
				rawOutput: 'HTTP/1.1 200 OK\nContent-Type: text/html',
				resolvedAddress: '93.184.216.34',
				statusCode: 200,
				statusCodeName: 'OK',
				rawHeaders: 'content-type: text/html; charset=UTF-8\nserver: ECS\ncontent-length: 1256',
				rawBody: '<!doctype html><html><head><title>Example Domain</title></head></html>',
				truncated: false,
				headers: {
					'content-type': 'text/html; charset=UTF-8',
					'server': 'ECS',
					'content-length': '1256'
				},
				timings: {
					total: 245,
					dns: 12,
					tcp: 45,
					tls: 78,
					firstByte: 123,
					download: 110
				},
				tls: null
			}
		}
	]
};

/**
 * DNS measurement with complete data
 */
export const successfulDnsMeasurement: Measurement = {
	id: 'dns-success-001',
	type: 'dns' as const,
	target: 'example.com',
	status: 'finished' as const,
	createdAt: '2024-01-01T12:00:00Z',
	updatedAt: '2024-01-01T12:00:03Z',
	probesCount: 1,
	results: [
		{
			probe: createProbe({
				continent: 'EU',
				region: 'Western Europe',
				country: 'FR',
				city: 'Paris',
				asn: 16276,
				network: 'OVH',
				latitude: 48.8566,
				longitude: 2.3522
			}),
			result: {
				status: 'finished' as const,
				rawOutput: '; <<>> DiG 9.10.6 <<>> example.com\n;; ANSWER SECTION:\nexample.com.\t\t300\tIN\tA\t93.184.216.34',
				statusCode: 0,
				statusCodeName: 'NOERROR',
				resolver: '8.8.8.8',
				answers: [
					{
						name: 'example.com',
						type: 'A',
						ttl: 300,
						class: 'IN',
						value: '93.184.216.34'
					}
				],
				timings: {
					total: 15
				}
			}
		}
	]
};

/**
 * Traceroute measurement with complete data
 */
export const successfulTracerouteMeasurement: Measurement = {
	id: 'traceroute-success-001',
	type: 'traceroute' as const,
	target: 'example.com',
	status: 'finished' as const,
	createdAt: '2024-01-01T12:00:00Z',
	updatedAt: '2024-01-01T12:00:20Z',
	probesCount: 1,
	results: [
		{
			probe: createProbe({
				continent: 'EU',
				region: 'Western Europe',
				country: 'NL',
				city: 'Amsterdam',
				asn: 1136,
				network: 'KPN',
				latitude: 52.3676,
				longitude: 4.9041
			}),
			result: {
				status: 'finished' as const,
				rawOutput: 'traceroute to example.com (93.184.216.34), 30 hops max\n1  192.168.1.1  1.2 ms\n2  10.0.0.1  5.3 ms',
				resolvedAddress: '93.184.216.34',
				resolvedHostname: null,
				hops: [
					{
						resolvedAddress: '192.168.1.1',
						resolvedHostname: null,
						timings: [{ rtt: 1.2 }]
					},
					{
						resolvedAddress: '10.0.0.1',
						resolvedHostname: null,
						timings: [{ rtt: 5.3 }]
					},
					{
						resolvedAddress: '93.184.216.34',
						resolvedHostname: null,
						timings: [{ rtt: 12.5 }]
					}
				]
			}
		}
	]
};

/**
 * Ping measurement with partial failure
 */
export const partialFailurePingMeasurement: Measurement = {
	id: 'ping-partial-001',
	type: 'ping' as const,
	target: 'example.com',
	status: 'finished' as const,
	createdAt: '2024-01-01T12:00:00Z',
	updatedAt: '2024-01-01T12:00:10Z',
	probesCount: 3,
	results: [
		{
			probe: createProbe({
				continent: 'EU',
				region: 'Western Europe',
				country: 'DE',
				city: 'Berlin',
				asn: 3320,
				network: 'Deutsche Telekom',
				latitude: 52.5200,
				longitude: 13.4050
			}),
			result: {
				status: 'finished' as const,
				rawOutput: 'PING example.com (93.184.216.34): 56 data bytes\n64 bytes from 93.184.216.34: icmp_seq=0 ttl=56 time=8.1 ms',
				resolvedAddress: '93.184.216.34',
				resolvedHostname: null,
				stats: {
					min: 8.1,
					avg: 9.3,
					max: 10.6,
					total: 3,
					rcv: 3,
					drop: 0,
					loss: 0
				},
				timings: []
			}
		},
		{
			probe: createProbe({
				continent: 'OC',
				region: 'Australia and New Zealand',
				country: 'AU',
				city: 'Sydney',
				asn: 1221,
				network: 'Telstra',
				latitude: -33.8688,
				longitude: 151.2093
			}),
			result: {
				status: 'failed' as const,
				rawOutput: 'PING example.com: Network timeout'
			}
		},
		{
			probe: createProbe({
				continent: 'AS',
				region: 'South-eastern Asia',
				country: 'SG',
				city: 'Singapore',
				asn: 7473,
				network: 'Singtel',
				latitude: 1.3521,
				longitude: 103.8198
			}),
			result: {
				status: 'finished' as const,
				rawOutput: 'PING example.com (93.184.216.34): 56 data bytes\n64 bytes from 93.184.216.34: icmp_seq=0 ttl=56 time=180.2 ms',
				resolvedAddress: '93.184.216.34',
				resolvedHostname: null,
				stats: {
					min: 180.2,
					avg: 182.5,
					max: 185.1,
					total: 3,
					rcv: 3,
					drop: 0,
					loss: 0
				},
				timings: []
			}
		}
	]
};

/**
 * Measurement with missing probe location data (defensive programming test)
 */
export const missingProbeDataMeasurement: Measurement = {
	id: 'ping-missing-001',
	type: 'ping' as const,
	target: 'example.com',
	status: 'finished' as const,
	createdAt: '2024-01-01T12:00:00Z',
	updatedAt: '2024-01-01T12:00:10Z',
	probesCount: 3,
	results: [
		{
			probe: createProbe({}),
			result: {
				status: 'finished' as const,
				rawOutput: 'PING example.com: 56 data bytes',
				resolvedAddress: '93.184.216.34',
				resolvedHostname: null,
				stats: {
					min: 5.1,
					avg: 5.3,
					max: 5.6,
					total: 3,
					rcv: 3,
					drop: 0,
					loss: 0
				},
				timings: []
			}
		},
		{
			probe: createProbe({ country: 'US' }),
			result: {
				status: 'finished' as const,
				rawOutput: 'PING example.com: 56 data bytes',
				resolvedAddress: '93.184.216.34',
				resolvedHostname: null,
				stats: {
					min: 10.2,
					avg: 11.5,
					max: 13.1,
					total: 3,
					rcv: 3,
					drop: 0,
					loss: 0
				},
				timings: []
			}
		},
		{
			probe: createProbe({
				continent: 'AS',
				network: 'Unknown ISP'
			}),
			result: {
				status: 'finished' as const,
				rawOutput: 'PING example.com: 56 data bytes',
				resolvedAddress: '93.184.216.34',
				resolvedHostname: null,
				stats: {
					min: 150.3,
					avg: 151.2,
					max: 152.8,
					total: 3,
					rcv: 3,
					drop: 0,
					loss: 0
				},
				timings: []
			}
		}
	]
};

/**
 * Measurement with nested result structure (API returns result.result)
 */
export const nestedResultMeasurement: Measurement = {
	id: 'ping-nested-001',
	type: 'ping' as const,
	target: 'example.com',
	status: 'finished' as const,
	createdAt: '2024-01-01T12:00:00Z',
	updatedAt: '2024-01-01T12:00:10Z',
	probesCount: 1,
	results: [
		{
			probe: createProbe({
				country: 'US',
				city: 'Test',
				network: 'Test Network'
			}),
			result: {
				result: {
					status: 'finished' as const,
					rawOutput: 'PING example.com: 56 data bytes',
					resolvedAddress: '93.184.216.34',
					resolvedHostname: null,
					stats: {
						min: 5.1,
						avg: 5.3,
						max: 5.6,
						total: 3,
						rcv: 3,
						drop: 0,
						loss: 0
					},
					timings: []
				}
			}
		} as any
	]
};

/**
 * In-progress measurement
 */
export const inProgressMeasurement: Measurement = {
	id: 'ping-inprogress-001',
	type: 'ping' as const,
	target: 'example.com',
	status: 'in-progress' as const,
	createdAt: '2024-01-01T12:00:00Z',
	updatedAt: '2024-01-01T12:00:05Z',
	probesCount: 2,
	results: [
		{
			probe: createProbe({
				country: 'US',
				city: 'Test',
				network: 'Test Network'
			}),
			result: {
				status: 'in-progress' as const,
				rawOutput: ''
			}
		},
		{
			probe: createProbe({
				country: 'GB',
				city: 'Test2',
				network: 'Test Network 2'
			}),
			result: {
				status: 'in-progress' as const,
				rawOutput: ''
			}
		}
	]
};
