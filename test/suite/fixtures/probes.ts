/**
 * Probe Fixtures
 *
 * Predefined probe data for testing various scenarios.
 */

import { Probe } from 'globalping';

/**
 * Complete probe with all fields
 */
export const completeProbe: Probe = {
	version: '0.27.0',
	location: {
		continent: 'EU',
		region: 'Western Europe',
		country: 'DE',
		state: null,
		city: 'Falkenstein',
		asn: 24940,
		network: 'Hetzner Online',
		latitude: 50.4779,
		longitude: 12.3713
	},
	tags: ['datacenter-network'],
	resolvers: ['8.8.8.8', '8.8.4.4']
};

/**
 * Probe with only country (no city)
 */
export const probeWithoutCity: Probe = {
	version: '0.27.0',
	location: {
		continent: 'NA',
		region: 'Northern America',
		country: 'US',
		state: null,
		city: '',
		asn: 16509,
		network: 'AWS',
		latitude: 37.7749,
		longitude: -122.4194
	},
	tags: ['datacenter-network', 'aws-us-west-1'],
	resolvers: ['private']
};

/**
 * Probe with only continent (no city or country)
 */
export const probeWithOnlyContinent: Probe = {
	version: '0.27.0',
	location: {
		continent: 'EU',
		region: 'Western Europe',
		country: 'DE',
		state: null,
		city: '',
		asn: 0,
		network: 'Some Network',
		latitude: 51.1657,
		longitude: 10.4515
	},
	tags: ['datacenter-network'],
	resolvers: ['8.8.8.8']
};

/**
 * Probe with no network information
 */
export const probeWithoutNetwork: Probe = {
	version: '0.27.0',
	location: {
		continent: 'EU',
		region: 'Northern Europe',
		country: 'GB',
		state: null,
		city: 'London',
		asn: 0,
		network: '',
		latitude: 51.5074,
		longitude: -0.1278
	},
	tags: ['eyeball-network'],
	resolvers: ['1.1.1.1']
};

/**
 * Empty probe (minimal required fields)
 */
export const emptyProbe: Probe = {
	version: '0.27.0',
	location: {
		continent: 'EU',
		region: 'Western Europe',
		country: 'DE',
		state: null,
		city: '',
		asn: 0,
		network: '',
		latitude: 0,
		longitude: 0
	},
	tags: [],
	resolvers: []
};

/**
 * List of probes from different locations
 */
export const globalProbeList: Probe[] = [
	{
		version: '0.27.0',
		location: {
			continent: 'NA',
			region: 'Northern America',
			country: 'US',
			state: 'NY',
			city: 'New York',
			asn: 701,
			network: 'Verizon',
			latitude: 40.7128,
			longitude: -74.0060
		},
		tags: ['eyeball-network'],
		resolvers: ['8.8.8.8', '8.8.4.4']
	},
	{
		version: '0.27.0',
		location: {
			continent: 'EU',
			region: 'Northern Europe',
			country: 'GB',
			state: null,
			city: 'London',
			asn: 2856,
			network: 'BT',
			latitude: 51.5074,
			longitude: -0.1278
		},
		tags: ['eyeball-network'],
		resolvers: ['1.1.1.1']
	},
	{
		version: '0.27.0',
		location: {
			continent: 'AS',
			region: 'Eastern Asia',
			country: 'JP',
			state: null,
			city: 'Tokyo',
			asn: 2914,
			network: 'NTT',
			latitude: 35.6762,
			longitude: 139.6503
		},
		tags: ['datacenter-network'],
		resolvers: ['8.8.8.8']
	},
	{
		version: '0.27.0',
		location: {
			continent: 'OC',
			region: 'Australia and New Zealand',
			country: 'AU',
			state: null,
			city: 'Sydney',
			asn: 1221,
			network: 'Telstra',
			latitude: -33.8688,
			longitude: 151.2093
		},
		tags: ['eyeball-network'],
		resolvers: ['8.8.8.8', '1.1.1.1']
	},
	{
		version: '0.27.0',
		location: {
			continent: 'SA',
			region: 'South America',
			country: 'BR',
			state: null,
			city: 'São Paulo',
			asn: 7738,
			network: 'Telefónica',
			latitude: -23.5505,
			longitude: -46.6333
		},
		tags: ['eyeball-network'],
		resolvers: ['8.8.8.8']
	}
];
