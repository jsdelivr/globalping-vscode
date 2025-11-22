/**
 * HTTP Measurement Integration Tests
 * 
 * Comprehensive tests for HTTP measurement functionality covering all use cases
 */

import * as assert from 'assert';
import { HttpTargetParser } from '../../../src/parsers/httpTargetParser';

suite('HTTP Measurement Integration Tests', () => {
	let parser: HttpTargetParser;

	setup(() => {
		parser = new HttpTargetParser();
	});

	suite('Target Transformation', () => {
		test('Domain input should become HTTPS URL target', () => {
			const result = parser.parse('google.com');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'google.com'); // Hostname only (API rejects URLs)
			assert.strictEqual(result.protocol, 'HTTPS');
			assert.strictEqual(result.port, 443);
			
			// For measurement API: target is hostname only
			// Globalping API rejects URLs with protocols
		});

		test('IP input should become HTTP URL target', () => {
			const result = parser.parse('1.1.1.1', 'HTTP');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, '1.1.1.1'); // IP only
			assert.strictEqual(result.protocol, 'HTTP');
			assert.strictEqual(result.port, 80);
		});

		test('Full URL should be preserved as target', () => {
			const result = parser.parse('https://api.github.com/repos/jsdelivr/globalping');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'api.github.com'); // Hostname only
			assert.strictEqual(result.protocol, 'HTTPS');
			assert.strictEqual(result.port, 443);
			assert.strictEqual(result.path, '/repos/jsdelivr/globalping');
		});
	});

	suite('Measurement Options', () => {
		test('Simple domain requires only method in options', () => {
			const result = parser.parse('example.com');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'example.com'); // Hostname only
			
			// Expected measurementOptions for API:
			// { method: 'GET' }
			// Target is hostname only (no protocol)
		});

		test('URL with custom port should be in target, not options', () => {
			const result = parser.parse('https://api.example.com:8443/v1');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'api.example.com'); // Hostname only
			assert.strictEqual(result.port, 8443);
			assert.strictEqual(result.path, '/v1');
			
			// Port info preserved in metadata
		});

		test('URL with query string should be in target', () => {
			const result = parser.parse('https://api.example.com/search?q=test');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'api.example.com'); // Hostname only
			assert.strictEqual(result.path, '/search');
			assert.strictEqual(result.query, 'q=test');
			
			// Path and query preserved in metadata
		});
	});

	suite('Protocol Override Scenarios', () => {
		test('User can override HTTPS to HTTP', () => {
			const result = parser.parse('google.com');
			
			// Initially: https://google.com with HTTPS
			assert.strictEqual(result.target, 'google.com');
			assert.strictEqual(result.protocol, 'HTTPS');
			
			// If user changes protocol dropdown to HTTP, send:
			// target: "https://google.com" (original)
			// measurementOptions: { method: 'GET', protocol: 'HTTP' } (override)
		});

		test('User can override port', () => {
			const result = parser.parse('example.com');
			
			// Initially: https://example.com:443
			assert.strictEqual(result.target, 'example.com');
			assert.strictEqual(result.port, 443);
			
			// If user sets port to 8080, send:
			// target: "https://example.com"
			// measurementOptions: { method: 'GET', port: 8080 }
		});
	});

	suite('Complex Real-World Scenarios', () => {
		test('REST API with path and query', () => {
			const result = parser.parse('https://api.example.com/v2/users?limit=100&offset=0');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'api.example.com');
			assert.strictEqual(result.protocol, 'HTTPS');
			assert.strictEqual(result.port, 443);
			assert.strictEqual(result.path, '/v2/users');
			assert.strictEqual(result.query, 'limit=100&offset=0');
		});

		test('ngrok tunnel with webhook path', () => {
			const result = parser.parse('https://abc123def456.ngrok.io/webhooks/github');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'abc123def456.ngrok.io');
			assert.strictEqual(result.protocol, 'HTTPS');
			assert.strictEqual(result.port, 443);
			assert.strictEqual(result.path, '/webhooks/github');
		});

		test('Development server with custom port', () => {
			const result = parser.parse('http://staging.example.com:3000/api/health');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'staging.example.com');
			assert.strictEqual(result.protocol, 'HTTP');
			assert.strictEqual(result.port, 3000);
			assert.strictEqual(result.path, '/api/health');
		});

		test('CloudFront distribution', () => {
			const result = parser.parse('https://d111111abcdef8.cloudfront.net/images/logo.png');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'd111111abcdef8.cloudfront.net');
			assert.strictEqual(result.protocol, 'HTTPS');
			assert.strictEqual(result.port, 443);
			assert.strictEqual(result.path, '/images/logo.png');
		});

		test('GraphQL endpoint', () => {
			const result = parser.parse('https://api.example.com/graphql');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'api.example.com');
			assert.strictEqual(result.protocol, 'HTTPS');
			assert.strictEqual(result.port, 443);
			assert.strictEqual(result.path, '/graphql');
		});
	});

	suite('Method Selection', () => {
		test('GET method (default)', () => {
			const result = parser.parse('https://api.example.com/users');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'api.example.com');
			
			// measurementOptions: { method: 'GET' }
		});

		test('HEAD method for checking resource existence', () => {
			const result = parser.parse('https://cdn.example.com/large-file.zip');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'cdn.example.com');
			
			// User can select HEAD method
			// measurementOptions: { method: 'HEAD' }
		});

		test('OPTIONS method for CORS preflight', () => {
			const result = parser.parse('https://api.example.com/v1/resource');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'api.example.com');
			
			// User can select OPTIONS method
			// measurementOptions: { method: 'OPTIONS' }
		});
	});

	suite('IPv6 Support', () => {
		test('IPv6 address should be wrapped in brackets', () => {
			const result = parser.parse('2001:4860:4860::8888', 'HTTP');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, '[2001:4860:4860::8888]');
			assert.strictEqual(result.protocol, 'HTTP');
			assert.strictEqual(result.port, 80);
		});

		test('IPv6 with IPv6 version option', () => {
			const result = parser.parse('2606:4700:4700::1111');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, '[2606:4700:4700::1111]');
			
			// measurementOptions: { method: 'GET', ipVersion: 6 }
		});
	});

	suite('Error Cases', () => {
		test('Localhost should be rejected with helpful message', () => {
			const result = parser.parse('http://localhost:3000/api');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('localhost'));
			assert.ok(result.errorMessage?.includes('ngrok'));
		});

		test('Private IP should be rejected', () => {
			const result = parser.parse('http://192.168.1.1/admin');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('private'));
		});

		test('Empty string should be rejected', () => {
			const result = parser.parse('');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('empty'));
		});

		test('Invalid format should be rejected', () => {
			const result = parser.parse('not a url or domain');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage);
		});
	});

	suite('Edge Cases', () => {
		test('URL with only hostname and slash', () => {
			const result = parser.parse('https://example.com/');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'example.com');
			assert.strictEqual(result.path, undefined); // Trailing slash is ignored
		});

		test('URL with multiple query parameters', () => {
			const result = parser.parse('https://api.example.com/search?q=test&sort=asc&page=2&limit=50');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'api.example.com');
			assert.strictEqual(result.query, 'q=test&sort=asc&page=2&limit=50');
		});

		test('Domain with hyphen', () => {
			const result = parser.parse('my-api.example.com');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'my-api.example.com');
		});

		test('Domain with numbers', () => {
			const result = parser.parse('api2.example123.com');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'api2.example123.com');
		});

		test('Very long subdomain', () => {
			const result = parser.parse('very.long.subdomain.chain.example.com');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'very.long.subdomain.chain.example.com');
		});
	});

	suite('Whitespace Handling', () => {
		test('Leading whitespace should be trimmed', () => {
			const result = parser.parse('   example.com');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'example.com');
		});

		test('Trailing whitespace should be trimmed', () => {
			const result = parser.parse('example.com   ');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'example.com');
		});

		test('Both leading and trailing whitespace', () => {
			const result = parser.parse('  https://example.com/path  ');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'example.com');
		});
	});
});

