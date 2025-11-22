/**
 * MeasurementBuilder Test Suite
 *
 * Comprehensive tests for the MeasurementBuilder service that handles
 * target parsing and measurement configuration building for all test types.
 */

import * as assert from 'assert';
import { MeasurementBuilder } from '../../../src/services/measurementBuilder';

suite('MeasurementBuilder Test Suite', () => {
	let builder: MeasurementBuilder;

	setup(() => {
		builder = new MeasurementBuilder();
	});

	suite('HTTP Tests - URLs', () => {
		test('Should build HTTP config with full URL', () => {
			const result = builder.buildConfig(
				'https://api.github.com/repos/jsdelivr/globalping',
				'http',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'api.github.com');
			assert.strictEqual(result.measurementOptions.protocol, 'HTTPS');
			assert.strictEqual(result.measurementOptions.port, 443);
			assert.strictEqual(result.measurementOptions.request.method, 'GET');
			assert.strictEqual(result.measurementOptions.request.path, '/repos/jsdelivr/globalping');
		});

		test('Should build HTTP config with URL containing query string', () => {
			const result = builder.buildConfig(
				'https://api.example.com/search?q=test&limit=10',
				'http',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'api.example.com');
			assert.strictEqual(result.measurementOptions.protocol, 'HTTPS');
			assert.strictEqual(result.measurementOptions.port, 443);
			assert.strictEqual(result.measurementOptions.request.path, '/search');
			assert.strictEqual(result.measurementOptions.request.query, 'q=test&limit=10');
		});

		test('Should build HTTP config with custom port', () => {
			const result = builder.buildConfig(
				'http://example.com:8080/api',
				'http',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'example.com');
			assert.strictEqual(result.measurementOptions.protocol, 'HTTP');
			assert.strictEqual(result.measurementOptions.port, 8080);
			assert.strictEqual(result.measurementOptions.request.path, '/api');
		});

		test('Should handle URL with only trailing slash', () => {
			const result = builder.buildConfig(
				'https://example.com/',
				'http',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'example.com');
			assert.strictEqual(result.measurementOptions.protocol, 'HTTPS');
			assert.strictEqual(result.measurementOptions.port, 443);
			assert.strictEqual(result.measurementOptions.request.path, undefined);
		});
	});

	suite('HTTP Tests - Domains', () => {
		test('Should build HTTP config with bare domain using HTTPS default', () => {
			const result = builder.buildConfig(
				'google.com',
				'http',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'google.com');
			assert.strictEqual(result.measurementOptions.protocol, 'HTTPS');
			assert.strictEqual(result.measurementOptions.port, 443);
			assert.strictEqual(result.measurementOptions.request.method, 'GET');
			assert.strictEqual(result.measurementOptions.request.path, undefined);
			assert.strictEqual(result.measurementOptions.request.query, undefined);
		});

		test('Should build HTTP config with bare domain using HTTP default', () => {
			const result = builder.buildConfig(
				'example.com',
				'http',
				'HTTP'
			);

			assert.strictEqual(result.target, 'example.com');
			assert.strictEqual(result.measurementOptions.protocol, 'HTTP');
			assert.strictEqual(result.measurementOptions.port, 80);
			assert.strictEqual(result.measurementOptions.request.method, 'GET');
		});

		test('Should build HTTP config with subdomain', () => {
			const result = builder.buildConfig(
				'api.example.com',
				'http',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'api.example.com');
			assert.strictEqual(result.measurementOptions.protocol, 'HTTPS');
			assert.strictEqual(result.measurementOptions.port, 443);
		});
	});

	suite('HTTP Tests - IP Addresses', () => {
		test('Should build HTTP config with IPv4 address', () => {
			const result = builder.buildConfig(
				'8.8.8.8',
				'http',
				'HTTP'
			);

			assert.strictEqual(result.target, '8.8.8.8');
			assert.strictEqual(result.measurementOptions.protocol, 'HTTP');
			assert.strictEqual(result.measurementOptions.port, 80);
			assert.strictEqual(result.measurementOptions.request.method, 'GET');
		});

		test('Should build HTTP config with IPv6 address (bracketed)', () => {
			const result = builder.buildConfig(
				'2001:4860:4860::8888',
				'http',
				'HTTPS'
			);

			assert.strictEqual(result.target, '[2001:4860:4860::8888]');
			assert.strictEqual(result.measurementOptions.protocol, 'HTTPS');
			assert.strictEqual(result.measurementOptions.port, 443);
		});
	});

	suite('HTTP Tests - Protocol Setting Respect', () => {
		test('Should respect defaultHttpProtocol setting (HTTPS)', () => {
			const result = builder.buildConfig(
				'example.com',
				'http',
				'HTTPS'
			);

			assert.strictEqual(result.measurementOptions.protocol, 'HTTPS');
			assert.strictEqual(result.measurementOptions.port, 443);
		});

		test('Should respect defaultHttpProtocol setting (HTTP)', () => {
			const result = builder.buildConfig(
				'example.com',
				'http',
				'HTTP'
			);

			assert.strictEqual(result.measurementOptions.protocol, 'HTTP');
			assert.strictEqual(result.measurementOptions.port, 80);
		});

		test('Should override default protocol when URL specifies HTTP', () => {
			const result = builder.buildConfig(
				'http://example.com',
				'http',
				'HTTPS'  // Default is HTTPS but URL says HTTP
			);

			assert.strictEqual(result.measurementOptions.protocol, 'HTTP');
			assert.strictEqual(result.measurementOptions.port, 80);
		});

		test('Should override default protocol when URL specifies HTTPS', () => {
			const result = builder.buildConfig(
				'https://example.com',
				'http',
				'HTTP'  // Default is HTTP but URL says HTTPS
			);

			assert.strictEqual(result.measurementOptions.protocol, 'HTTPS');
			assert.strictEqual(result.measurementOptions.port, 443);
		});
	});

	suite('HTTP Tests - User Overrides', () => {
		test('Should apply user override for method', () => {
			const result = builder.buildConfig(
				'example.com',
				'http',
				'HTTPS',
				{ userOverrides: { method: 'HEAD' } }
			);

			assert.strictEqual(result.measurementOptions.request.method, 'HEAD');
		});

		test('Should apply user override for protocol', () => {
			const result = builder.buildConfig(
				'example.com',
				'http',
				'HTTPS',
				{ userOverrides: { protocol: 'HTTP' } }
			);

			assert.strictEqual(result.measurementOptions.protocol, 'HTTP');
		});

		test('Should apply user override for port', () => {
			const result = builder.buildConfig(
				'example.com',
				'http',
				'HTTPS',
				{ userOverrides: { port: 8443 } }
			);

			assert.strictEqual(result.measurementOptions.port, 8443);
		});

		test('Should apply multiple user overrides simultaneously', () => {
			const result = builder.buildConfig(
				'example.com',
				'http',
				'HTTPS',
				{
					userOverrides: {
						method: 'OPTIONS',
						protocol: 'HTTP',
						port: 3000
					}
				}
			);

			assert.strictEqual(result.measurementOptions.request.method, 'OPTIONS');
			assert.strictEqual(result.measurementOptions.protocol, 'HTTP');
			assert.strictEqual(result.measurementOptions.port, 3000);
		});

		test('Should merge additional user overrides like resolver', () => {
			const result = builder.buildConfig(
				'example.com',
				'http',
				'HTTPS',
				{
					userOverrides: {
						resolver: '8.8.8.8'
					}
				}
			);

			assert.strictEqual(result.measurementOptions.resolver, '8.8.8.8');
			assert.strictEqual(result.measurementOptions.request.method, 'GET');
		});
	});

	suite('Non-HTTP Tests - Ping', () => {
		test('Should extract hostname from URL for ping', () => {
			const result = builder.buildConfig(
				'https://google.com/path',
				'ping',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'google.com');
			assert.deepStrictEqual(result.measurementOptions, {});
		});

		test('Should pass through bare hostname for ping', () => {
			const result = builder.buildConfig(
				'google.com',
				'ping',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'google.com');
			assert.deepStrictEqual(result.measurementOptions, {});
		});

		test('Should pass through IP address for ping', () => {
			const result = builder.buildConfig(
				'8.8.8.8',
				'ping',
				'HTTPS'
			);

			assert.strictEqual(result.target, '8.8.8.8');
			assert.deepStrictEqual(result.measurementOptions, {});
		});

		test('Should apply user overrides for ping measurement options', () => {
			const result = builder.buildConfig(
				'google.com',
				'ping',
				'HTTPS',
				{ userOverrides: { packets: 5, protocol: 'TCP', port: 443 } }
			);

			assert.strictEqual(result.target, 'google.com');
			assert.strictEqual(result.measurementOptions.packets, 5);
			assert.strictEqual(result.measurementOptions.protocol, 'TCP');
			assert.strictEqual(result.measurementOptions.port, 443);
		});
	});

	suite('Non-HTTP Tests - DNS', () => {
		test('Should extract hostname from URL for DNS', () => {
			const result = builder.buildConfig(
				'https://example.com:8080/path',
				'dns',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'example.com');
			assert.deepStrictEqual(result.measurementOptions, {});
		});

		test('Should pass through bare hostname for DNS', () => {
			const result = builder.buildConfig(
				'example.com',
				'dns',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'example.com');
			assert.deepStrictEqual(result.measurementOptions, {});
		});

		test('Should apply user overrides for DNS query options', () => {
			const result = builder.buildConfig(
				'example.com',
				'dns',
				'HTTPS',
				{
					userOverrides: {
						query: { type: 'AAAA' },
						resolver: '1.1.1.1',
						trace: true
					}
				}
			);

			assert.strictEqual(result.target, 'example.com');
			assert.deepStrictEqual(result.measurementOptions.query, { type: 'AAAA' });
			assert.strictEqual(result.measurementOptions.resolver, '1.1.1.1');
			assert.strictEqual(result.measurementOptions.trace, true);
		});
	});

	suite('Non-HTTP Tests - Traceroute', () => {
		test('Should extract hostname from URL for traceroute', () => {
			const result = builder.buildConfig(
				'http://example.com/api',
				'traceroute',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'example.com');
			assert.deepStrictEqual(result.measurementOptions, {});
		});

		test('Should pass through bare hostname for traceroute', () => {
			const result = builder.buildConfig(
				'example.com',
				'traceroute',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'example.com');
			assert.deepStrictEqual(result.measurementOptions, {});
		});

		test('Should apply user overrides for traceroute options', () => {
			const result = builder.buildConfig(
				'example.com',
				'traceroute',
				'HTTPS',
				{ userOverrides: { protocol: 'UDP', port: 33434 } }
			);

			assert.strictEqual(result.target, 'example.com');
			assert.strictEqual(result.measurementOptions.protocol, 'UDP');
			assert.strictEqual(result.measurementOptions.port, 33434);
		});
	});

	suite('Non-HTTP Tests - MTR', () => {
		test('Should extract hostname from URL for MTR', () => {
			const result = builder.buildConfig(
				'https://cloudflare.com',
				'mtr',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'cloudflare.com');
			assert.deepStrictEqual(result.measurementOptions, {});
		});

		test('Should pass through bare hostname for MTR', () => {
			const result = builder.buildConfig(
				'cloudflare.com',
				'mtr',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'cloudflare.com');
			assert.deepStrictEqual(result.measurementOptions, {});
		});

		test('Should apply user overrides for MTR options', () => {
			const result = builder.buildConfig(
				'cloudflare.com',
				'mtr',
				'HTTPS',
				{ userOverrides: { packets: 10, protocol: 'ICMP' } }
			);

			assert.strictEqual(result.target, 'cloudflare.com');
			assert.strictEqual(result.measurementOptions.packets, 10);
			assert.strictEqual(result.measurementOptions.protocol, 'ICMP');
		});
	});

	suite('Validation Tests', () => {
		test('Should throw on invalid HTTP target', () => {
			assert.throws(
				() => builder.buildConfig('not-a-valid-target', 'http', 'HTTPS'),
				/Cannot parse/
			);
		});

		test('Should throw on localhost for HTTP', () => {
			assert.throws(
				() => builder.buildConfig('http://localhost:3000', 'http', 'HTTPS'),
				/localhost/
			);
		});

		test('Should throw on private IP for HTTP', () => {
			assert.throws(
				() => builder.buildConfig('192.168.1.1', 'http', 'HTTPS'),
				/private/
			);
		});

		test('Should throw on empty target for HTTP', () => {
			assert.throws(
				() => builder.buildConfig('', 'http', 'HTTPS'),
				/empty/
			);
		});

		test('Should throw on unsupported protocol (FTP) for HTTP', () => {
			assert.throws(
				() => builder.buildConfig('ftp://example.com', 'http', 'HTTPS'),
				/protocol/
			);
		});

		test('Should validate target successfully for public domain', () => {
			const validation = builder.validateTarget('google.com');

			assert.strictEqual(validation.isValid, true);
			assert.strictEqual(validation.errorMessage, undefined);
		});

		test('Should reject localhost in validation', () => {
			const validation = builder.validateTarget('localhost');

			assert.strictEqual(validation.isValid, false);
			assert.ok(validation.errorMessage?.includes('localhost'));
		});

		test('Should reject private IP in validation', () => {
			const validation = builder.validateTarget('192.168.1.1');

			assert.strictEqual(validation.isValid, false);
			assert.ok(validation.errorMessage?.includes('private'));
		});

		test('Should accept public IP in validation', () => {
			const validation = builder.validateTarget('8.8.8.8');

			assert.strictEqual(validation.isValid, true);
		});
	});

	suite('Real-World Scenarios', () => {
		test('Should handle GitHub API URL', () => {
			const result = builder.buildConfig(
				'https://api.github.com/repos/jsdelivr/globalping',
				'http',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'api.github.com');
			assert.strictEqual(result.measurementOptions.protocol, 'HTTPS');
			assert.strictEqual(result.measurementOptions.request.path, '/repos/jsdelivr/globalping');
		});

		test('Should handle ngrok tunnel URL', () => {
			const result = builder.buildConfig(
				'https://abc123.ngrok.io/webhook',
				'http',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'abc123.ngrok.io');
			assert.strictEqual(result.measurementOptions.protocol, 'HTTPS');
			assert.strictEqual(result.measurementOptions.request.path, '/webhook');
		});

		test('Should handle CloudFront distribution', () => {
			const result = builder.buildConfig(
				'https://d111111abcdef8.cloudfront.net/images/logo.png',
				'http',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'd111111abcdef8.cloudfront.net');
			assert.strictEqual(result.measurementOptions.request.path, '/images/logo.png');
		});

		test('Should handle ping to Cloudflare DNS from URL', () => {
			const result = builder.buildConfig(
				'https://1.1.1.1',
				'ping',
				'HTTPS'
			);

			assert.strictEqual(result.target, '1.1.1.1');
			assert.deepStrictEqual(result.measurementOptions, {});
		});

		test('Should handle DNS lookup with bare domain', () => {
			const result = builder.buildConfig(
				'example.com',
				'dns',
				'HTTPS',
				{ userOverrides: { query: { type: 'MX' } } }
			);

			assert.strictEqual(result.target, 'example.com');
			assert.deepStrictEqual(result.measurementOptions.query, { type: 'MX' });
		});

		test('Should handle traceroute with complex URL', () => {
			const result = builder.buildConfig(
				'https://api.stripe.com:443/v1/charges',
				'traceroute',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'api.stripe.com');
			assert.deepStrictEqual(result.measurementOptions, {});
		});
	});

	suite('Edge Cases', () => {
		test('Should handle domain with hyphens', () => {
			const result = builder.buildConfig(
				'my-api.example.com',
				'http',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'my-api.example.com');
		});

		test('Should handle domain with numbers', () => {
			const result = builder.buildConfig(
				'api2.example123.com',
				'http',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'api2.example123.com');
		});

		test('Should handle very long subdomain chain', () => {
			const result = builder.buildConfig(
				'very.long.subdomain.chain.example.com',
				'ping',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'very.long.subdomain.chain.example.com');
		});

		test('Should trim whitespace from input', () => {
			const result = builder.buildConfig(
				'  example.com  ',
				'http',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'example.com');
		});

		test('Should handle URL with complex query string', () => {
			const result = builder.buildConfig(
				'https://api.example.com/search?q=test+value&sort=asc&page=1&limit=50',
				'http',
				'HTTPS'
			);

			assert.strictEqual(result.target, 'api.example.com');
			assert.strictEqual(result.measurementOptions.request.query, 'q=test+value&sort=asc&page=1&limit=50');
		});
	});

	suite('Consistency Tests', () => {
		test('Same input should produce same output across calls', () => {
			const result1 = builder.buildConfig('example.com', 'http', 'HTTPS');
			const result2 = builder.buildConfig('example.com', 'http', 'HTTPS');

			assert.deepStrictEqual(result1, result2);
		});

		test('Different builders should produce same output', () => {
			const builder1 = new MeasurementBuilder();
			const builder2 = new MeasurementBuilder();

			const result1 = builder1.buildConfig('example.com', 'http', 'HTTPS');
			const result2 = builder2.buildConfig('example.com', 'http', 'HTTPS');

			assert.deepStrictEqual(result1, result2);
		});
	});
});
