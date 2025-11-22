/**
 * HTTP Target Parser Tests
 * 
 * Tests for parsing HTTP targets (URLs, domains, IPs) into components
 */

import * as assert from 'assert';
import { HttpTargetParser } from '../../../src/parsers/httpTargetParser';

suite('HttpTargetParser Test Suite', () => {
	let parser: HttpTargetParser;

	setup(() => {
		parser = new HttpTargetParser();
	});

	suite('URL Parsing', () => {
		test('Should parse HTTPS URL with path', () => {
			const result = parser.parse('https://api.github.com/users/octocat');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'api.github.com'); // Hostname only (no protocol)
			assert.strictEqual(result.protocol, 'HTTPS');
			assert.strictEqual(result.port, 443);
			assert.strictEqual(result.path, '/users/octocat');
			assert.strictEqual(result.query, undefined);
		});

		test('Should parse HTTP URL with custom port', () => {
			const result = parser.parse('http://example.com:8080/api');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'example.com'); // Hostname only
			assert.strictEqual(result.protocol, 'HTTP');
			assert.strictEqual(result.port, 8080);
			assert.strictEqual(result.path, '/api');
		});

		test('Should parse HTTPS URL with query string', () => {
			const result = parser.parse('https://api.example.com/search?q=test&limit=10');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'api.example.com'); // Hostname only
			assert.strictEqual(result.protocol, 'HTTPS');
			assert.strictEqual(result.port, 443);
			assert.strictEqual(result.path, '/search');
			assert.strictEqual(result.query, 'q=test&limit=10');
		});

		test('Should parse HTTPS URL with custom port 8443', () => {
			const result = parser.parse('https://secure.example.com:8443/admin');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'secure.example.com'); // Hostname only
			assert.strictEqual(result.protocol, 'HTTPS');
			assert.strictEqual(result.port, 8443);
			assert.strictEqual(result.path, '/admin');
		});

		test('Should ignore trailing slash in path', () => {
			const result = parser.parse('https://example.com/');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'example.com'); // Hostname only
			assert.strictEqual(result.path, undefined);
		});

		test('Should parse URL without path', () => {
			const result = parser.parse('https://example.com');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'example.com'); // Hostname only
			assert.strictEqual(result.protocol, 'HTTPS');
			assert.strictEqual(result.port, 443);
			assert.strictEqual(result.path, undefined);
			assert.strictEqual(result.query, undefined);
		});

		test('Should reject localhost URL', () => {
			const result = parser.parse('http://localhost:3000/api');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('localhost'));
		});

		test('Should reject 127.0.0.1 URL', () => {
			const result = parser.parse('http://127.0.0.1:8080');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('localhost'));
		});
	});

	suite('Domain Parsing', () => {
		test('Should parse simple domain with HTTPS default', () => {
			const result = parser.parse('google.com');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'google.com'); // Hostname only
			assert.strictEqual(result.protocol, 'HTTPS');
			assert.strictEqual(result.port, 443);
			assert.strictEqual(result.path, undefined);
			assert.strictEqual(result.query, undefined);
		});

		test('Should parse subdomain', () => {
			const result = parser.parse('api.example.com');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'api.example.com'); // Hostname only
			assert.strictEqual(result.protocol, 'HTTPS');
			assert.strictEqual(result.port, 443);
		});

		test('Should parse multi-level subdomain', () => {
			const result = parser.parse('v1.api.example.com');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'v1.api.example.com'); // Hostname only
			assert.strictEqual(result.protocol, 'HTTPS');
			assert.strictEqual(result.port, 443);
		});

		test('Should reject localhost domain', () => {
			const result = parser.parse('localhost');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('localhost'));
		});

		test('Should reject .local domain', () => {
			const result = parser.parse('myapp.local');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('localhost'));
		});

		test('Should reject .localhost domain', () => {
			const result = parser.parse('api.localhost');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('localhost'));
		});
	});

	suite('IP Address Parsing', () => {
		test('Should parse public IPv4 with HTTP default', () => {
			const result = parser.parse('8.8.8.8', 'HTTP');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, '8.8.8.8'); // IP only
			assert.strictEqual(result.protocol, 'HTTP');
			assert.strictEqual(result.port, 80);
		});

		test('Should parse another public IPv4', () => {
			const result = parser.parse('1.1.1.1', 'HTTP');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, '1.1.1.1'); // IP only
			assert.strictEqual(result.protocol, 'HTTP');
			assert.strictEqual(result.port, 80);
		});

		test('Should reject 127.0.0.1', () => {
			const result = parser.parse('127.0.0.1');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('localhost'));
		});

		test('Should reject private IP 192.168.x.x', () => {
			const result = parser.parse('192.168.1.1');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('private'));
		});

		test('Should reject private IP 10.x.x.x', () => {
			const result = parser.parse('10.0.0.1');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('private'));
		});

		test('Should reject private IP 172.16.x.x', () => {
			const result = parser.parse('172.16.0.1');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('private'));
		});

		test('Should reject 0.0.0.0', () => {
			const result = parser.parse('0.0.0.0');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('localhost'));
		});

		test('Should parse public IPv6', () => {
			const result = parser.parse('2001:4860:4860::8888', 'HTTP');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, '[2001:4860:4860::8888]'); // Bracketed IPv6
			assert.strictEqual(result.protocol, 'HTTP');
			assert.strictEqual(result.port, 80);
		});

		test('Should reject IPv6 localhost ::1', () => {
			const result = parser.parse('::1');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('localhost'));
		});
	});

	suite('Edge Cases', () => {
		test('Should reject empty string', () => {
			const result = parser.parse('');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('empty'));
		});

		test('Should reject whitespace-only string', () => {
			const result = parser.parse('   ');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('empty'));
		});

		test('Should handle input with surrounding whitespace', () => {
			const result = parser.parse('  example.com  ');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'example.com'); // Hostname only
		});

		test('Should reject invalid URL format', () => {
			const result = parser.parse('not-a-valid-target');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage);
		});

		test('Should reject FTP protocol', () => {
			const result = parser.parse('ftp://example.com');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('protocol'));
		});

		test('Should reject invalid port', () => {
			const result = parser.parse('https://example.com:99999/api');
			
			assert.strictEqual(result.isValid, false);
			assert.ok(result.errorMessage?.includes('port'));
		});

		test('Should handle complex query string', () => {
			const result = parser.parse('https://api.example.com/search?q=test+value&sort=asc&page=1&limit=50');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'api.example.com'); // Hostname only
			assert.strictEqual(result.path, '/search');
			assert.strictEqual(result.query, 'q=test+value&sort=asc&page=1&limit=50');
		});

		test('Should handle URL with fragment (anchor)', () => {
			// Note: Fragments are typically not sent to server, but parser should handle them
			const result = parser.parse('https://example.com/page');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'example.com'); // Hostname only
		});
	});

	suite('Real-World Examples', () => {
		test('Should parse GitHub API URL', () => {
			const result = parser.parse('https://api.github.com/repos/jsdelivr/globalping');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'api.github.com'); // Hostname only
			assert.strictEqual(result.protocol, 'HTTPS');
			assert.strictEqual(result.port, 443);
			assert.strictEqual(result.path, '/repos/jsdelivr/globalping');
		});

		test('Should parse REST API with versioning', () => {
			const result = parser.parse('https://api.example.com/v2/users/123/profile?include=posts');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'api.example.com'); // Hostname only
			assert.strictEqual(result.path, '/v2/users/123/profile');
			assert.strictEqual(result.query, 'include=posts');
		});

		test('Should parse Cloudflare DNS IP', () => {
			const result = parser.parse('1.1.1.1', 'HTTP');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, '1.1.1.1'); // IP only
			assert.strictEqual(result.protocol, 'HTTP');
			assert.strictEqual(result.port, 80);
		});

		test('Should parse Google DNS IP', () => {
			const result = parser.parse('8.8.8.8', 'HTTP');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, '8.8.8.8'); // IP only
			assert.strictEqual(result.protocol, 'HTTP');
			assert.strictEqual(result.port, 80);
		});

		test('Should handle ngrok tunnel URL', () => {
			const result = parser.parse('https://abc123.ngrok.io/webhook');
			
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.target, 'abc123.ngrok.io'); // Hostname only
			assert.strictEqual(result.protocol, 'HTTPS');
			assert.strictEqual(result.port, 443);
			assert.strictEqual(result.path, '/webhook');
		});
	});
});

