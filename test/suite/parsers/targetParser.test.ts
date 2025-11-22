/**
 * Target Parser Tests
 * 
 * Tests for parsing user input to extract valid targets.
 * These tests verify real-world input scenarios users would provide.
 */

import * as assert from 'assert';
import { TargetParser } from '../../../src/parsers/targetParser';

suite('Target Parser', () => {
	let parser: TargetParser;

	suiteSetup(() => {
		parser = new TargetParser();
	});

	test('Should parse valid URLs', () => {
		const testCases = [
			'https://example.com',
			'http://example.com',
			'https://api.example.com/v1/endpoint',
			'https://example.com:8080/path?query=value'
		];

		for (const input of testCases) {
			const result = parser.parse(input);
			assert.ok(result.isValid, `Should parse ${input}`);
			assert.strictEqual(result.target, input);
		}
	});

	test('Should parse domain names', () => {
		const testCases = [
			'example.com',
			'subdomain.example.com',
			'api.example.co.uk'
		];

		for (const input of testCases) {
			const result = parser.parse(input);
			assert.ok(result.isValid, `Should parse ${input}`);
			assert.strictEqual(result.target, input);
		}
	});

	test('Should parse IP addresses', () => {
		const testCases = [
			'8.8.8.8',
			'2001:0db8:85a3:0000:0000:8a2e:0370:7334',
			'192.168.1.1'
		];

		for (const input of testCases) {
			const result = parser.parse(input);
			assert.ok(result.isValid, `Should parse ${input}`);
			assert.strictEqual(result.target, input);
		}
	});

	test('Should detect localhost', () => {
		const result = parser.parse('localhost');
		assert.ok(result.isValid);
		assert.ok(result.isLocalhost);
	});

	test('Should detect private IPs', () => {
		const privateIPs = [
			'192.168.1.1',
			'10.0.0.1',
			'172.16.0.1'
		];

		for (const ip of privateIPs) {
			const result = parser.parse(ip);
			assert.ok(result.isValid);
			assert.ok(result.isPrivateIp);
		}
	});

	test('Should extract target from markdown links', () => {
		const markdown = '[Example](https://example.com)';
		const result = parser.parse(markdown);
		assert.ok(result.isValid);
		assert.strictEqual(result.target, 'https://example.com');
	});

	test('Should handle invalid input', () => {
		const invalidInputs = [
			'',
			'   ',
			'not a valid target',
			'http://',
			'://example.com'
		];

		for (const input of invalidInputs) {
			const result = parser.parse(input);
			assert.ok(!result.isValid, `Should reject ${input}`);
		}
	});

	test('Should suggest test type based on target', () => {
		const httpResult = parser.parse('https://example.com');
		assert.ok(httpResult.suggestedTestType === 'http' || httpResult.suggestedTestType === 'ping');

		const domainResult = parser.parse('example.com');
		assert.ok(domainResult.suggestedTestType === 'ping' || domainResult.suggestedTestType === 'dns');
	});
});

