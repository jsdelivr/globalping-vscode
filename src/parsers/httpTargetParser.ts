/**
 * HTTP Target Parser
 * 
 * Parses HTTP targets (URLs, domains, IPs) into components for the Globalping API.
 * The API expects the hostname as the target field, with protocol, port, path, and query
 * passed as separate measurementOptions.
 */

import * as ipaddr from 'ipaddr.js';

export interface HttpTargetParts {
	target: string;            // Hostname only (e.g., "google.com" or "8.8.8.8" or "[::1]")
	protocol: 'HTTP' | 'HTTPS' | 'HTTP2';
	port: number;
	path?: string;
	query?: string;
	isValid: boolean;
	errorMessage?: string;
}

export class HttpTargetParser {
	// URL pattern to extract components
	private static readonly URL_PATTERN = /^(https?:\/\/)([^\s:/?#]+)(?::(\d+))?([^?\s]*)(\?[^\s]*)?$/i;
	
	// Domain pattern
	private static readonly DOMAIN_PATTERN = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z]{2,}$/;
	
	// IPv4 pattern
	private static readonly IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;
	
	// IPv6 pattern (simplified)
	private static readonly IPV6_PATTERN = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
	
	// Localhost patterns
	private static readonly LOCALHOST_PATTERNS = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];

	/**
	 * Parse HTTP target input into components
	 * Handles:
	 * - Full URLs: https://api.example.com:8080/v1/users?key=value
	 * - Domains: google.com (defaults to user's configured protocol)
	 * - IPs: 8.8.8.8 (defaults to user's configured protocol)
	 */
	public parse(input: string, defaultProtocol: 'HTTP' | 'HTTPS' = 'HTTPS'): HttpTargetParts {
		if (!input || !input.trim()) {
			return {
				target: '',
				protocol: 'HTTPS',
				port: 443,
				isValid: false,
				errorMessage: 'Target cannot be empty'
			};
		}

		const trimmed = input.trim();

		const protocolMatch = trimmed.match(/^([a-z0-9+.-]+):\/\//i);
		if (protocolMatch && !/^https?$/i.test(protocolMatch[1])) {
			return {
				target: trimmed,
				protocol: 'HTTPS',
				port: 443,
				isValid: false,
				errorMessage: `Unsupported protocol: ${protocolMatch[1]}. Use http:// or https://`
			};
		}

		// Try parsing as URL first (already has protocol)
		const urlResult = this.parseUrl(trimmed);
		if (urlResult) {
			return urlResult;
		}

		// Try parsing as domain (use configured default protocol)
		const domainResult = this.parseDomain(trimmed, defaultProtocol);
		if (domainResult) {
			return domainResult;
		}

		// Try parsing as IP address (use configured default protocol)
		const ipResult = this.parseIpAddress(trimmed, defaultProtocol);
		if (ipResult) {
			return ipResult;
		}

		// Invalid input
		return {
			target: trimmed,
			protocol: 'HTTPS',
			port: 443,
			isValid: false,
			errorMessage: `Cannot parse "${trimmed}" as a valid HTTP target. Expected: URL, domain, or IP address.`
		};
	}

	/**
	 * Parse URL format: http(s)://hostname:port/path?query
	 */
	private parseUrl(text: string): HttpTargetParts | null {
		const match = text.match(HttpTargetParser.URL_PATTERN);
		if (!match) {
			return null;
		}

		const protocol = match[1].toLowerCase();
		const hostname = match[2].toLowerCase();
		const portStr = match[3];
		const path = match[4] || undefined;
		const query = match[5] ? match[5].substring(1) : undefined; // Remove leading '?'

		// Validate protocol
		if (!['http://', 'https://'].includes(protocol)) {
			return {
				target: text,
				protocol: 'HTTPS',
				port: 443,
				isValid: false,
				errorMessage: `Unsupported protocol: ${protocol}. Use http:// or https://`
			};
		}

		// Check for localhost
		if (this.isLocalhost(hostname)) {
			return {
				target: text,
				protocol: 'HTTPS',
				port: 443,
				isValid: false,
				errorMessage: 'Cannot test localhost from external probes. Use a tunnel service like ngrok.'
			};
		}

		// Check for private IP
		if (this.isPrivateIp(hostname)) {
			return {
				target: text,
				protocol: 'HTTPS',
				port: 443,
				isValid: false,
				errorMessage: 'Cannot test private IP addresses from external probes.'
			};
		}

		// Determine protocol and default port
		const isHttps = protocol === 'https://';
		const apiProtocol: 'HTTP' | 'HTTPS' = isHttps ? 'HTTPS' : 'HTTP';
		const defaultPort = isHttps ? 443 : 80;
		const port = portStr ? parseInt(portStr, 10) : defaultPort;

		// Validate port
		if (isNaN(port) || port < 1 || port > 65535) {
			return {
				target: text,
				protocol: apiProtocol,
				port: defaultPort,
				isValid: false,
				errorMessage: `Invalid port: ${portStr}. Must be between 1 and 65535.`
			};
		}

		// Return hostname only (API rejects URLs with protocols)
		// Wrap IPv6 addresses in brackets if needed
		const finalHostname = hostname.includes(':') ? `[${hostname}]` : hostname;
		
		return {
			target: finalHostname,
			protocol: apiProtocol,
			port,
			path: path && path !== '/' ? path : undefined,
			query,
			isValid: true
		};
	}

	/**
	 * Parse domain name (uses configured default protocol)
	 */
	private parseDomain(text: string, defaultProtocol: 'HTTP' | 'HTTPS'): HttpTargetParts | null {
		if (!HttpTargetParser.DOMAIN_PATTERN.test(text)) {
			return null;
		}

		const hostname = text.toLowerCase();

		// Check for localhost-like domains
		if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
			return {
				target: text,
				protocol: defaultProtocol,
				port: defaultProtocol === 'HTTPS' ? 443 : 80,
				isValid: false,
				errorMessage: 'Cannot test localhost from external probes. Use a tunnel service like ngrok.'
			};
		}

		// Valid domain - return hostname only (API rejects protocols)
		const port = defaultProtocol === 'HTTPS' ? 443 : 80;
		return {
			target: hostname,
			protocol: defaultProtocol,
			port,
			isValid: true
		};
	}

	/**
	 * Parse IP address (uses configured default protocol)
	 */
	private parseIpAddress(text: string, defaultProtocol: 'HTTP' | 'HTTPS'): HttpTargetParts | null {
		// Try IPv4
		if (HttpTargetParser.IPV4_PATTERN.test(text)) {
			try {
				const addr = ipaddr.parse(text);
				
				// Check for localhost
				if (this.isLocalhost(text)) {
					return {
						target: text,
						protocol: defaultProtocol,
						port: defaultProtocol === 'HTTPS' ? 443 : 80,
						isValid: false,
						errorMessage: 'Cannot test localhost from external probes.'
					};
				}

				// Check for private IP
				if (addr.range() === 'private' || addr.range() === 'loopback') {
					return {
						target: text,
						protocol: defaultProtocol,
						port: defaultProtocol === 'HTTPS' ? 443 : 80,
						isValid: false,
						errorMessage: 'Cannot test private IP addresses from external probes.'
					};
				}

				// Valid public IPv4 - return IP only (API rejects protocols)
				return {
					target: text,
					protocol: defaultProtocol,
					port: defaultProtocol === 'HTTPS' ? 443 : 80,
					isValid: true
				};
			} catch {
				// Invalid IP
				return null;
			}
		}

		// Try IPv6
		if (HttpTargetParser.IPV6_PATTERN.test(text)) {
			try {
				const addr = ipaddr.parse(text);
				
				// Check for localhost
				if (this.isLocalhost(text)) {
					return {
						target: text,
						protocol: defaultProtocol,
						port: defaultProtocol === 'HTTPS' ? 443 : 80,
						isValid: false,
						errorMessage: 'Cannot test localhost from external probes.'
					};
				}

				// Check for private IP
				if (addr.range() === 'private' || addr.range() === 'loopback' || addr.range() === 'uniqueLocal') {
					return {
						target: text,
						protocol: defaultProtocol,
						port: defaultProtocol === 'HTTPS' ? 443 : 80,
						isValid: false,
						errorMessage: 'Cannot test private IP addresses from external probes.'
					};
				}

				// Valid public IPv6 - return with brackets (API requires bracketed IPv6)
				return {
					target: `[${text}]`,
					protocol: defaultProtocol,
					port: defaultProtocol === 'HTTPS' ? 443 : 80,
					isValid: true
				};
			} catch {
				// Invalid IP
				return null;
			}
		}

		return null;
	}

	/**
	 * Check if hostname is localhost
	 */
	private isLocalhost(hostname: string): boolean {
		return HttpTargetParser.LOCALHOST_PATTERNS.some(pattern => 
			hostname.toLowerCase() === pattern
		);
	}

	/**
	 * Check if hostname is a private IP address
	 */
	private isPrivateIp(hostname: string): boolean {
		try {
			const addr = ipaddr.parse(hostname);
			const range = addr.range();
			return range === 'private' || range === 'loopback' || range === 'uniqueLocal';
		} catch {
			// Not an IP address
			return false;
		}
	}
}

